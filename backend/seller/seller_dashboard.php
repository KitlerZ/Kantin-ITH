            echo json_encode([
                'status' => 'success',
                'today_orders' => $todayOrders,
                'active_menu' => $activeMenu,
                'confirmed_transactions' => $confirmedTransactions,
                'low_stock_count' => $lowStockCount
            ]);
            break;

        case 'get_seller_saldo':
            if (!isset($data['userId'])) {
                throw new Exception('User ID tidak ditemukan dalam permintaan.');
            }

            $userId = $data['userId'];
            $sql = "SELECT saldo FROM users WHERE id = ?";
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare statement for get_seller_saldo failed: " . $conn->errorInfo()[2]);
            }
            $stmt->execute([$userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user) {
                echo json_encode(['status' => 'success', 'saldo' => floatval($user['saldo'])]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'User tidak ditemukan']);
            }
            break;

        case 'get_seller_transactions':
            if (!isset($data['userId'])) {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'User ID penjual tidak ditemukan dalam permintaan.'
                ]);
                exit;
            }

            $sellerId = $data['userId'];
            $filter = $data['filter'] ?? 'all';

            try {
                $query = "SELECT id, user_id, jenis, jumlah, keterangan, created_at AS transaction_time 
                         FROM transactions 
                         WHERE user_id = ?";
                
                $params = [$sellerId];

                if ($filter === 'today') {
                    $query .= " AND DATE(created_at) = CURDATE()";
                } elseif ($filter === 'week') {
                    $query .= " AND created_at >= CURDATE() - INTERVAL 7 DAY";
                } elseif ($filter === 'month') {
                    $query .= " AND created_at >= CURDATE() - INTERVAL 30 DAY";
                }

                $query .= " ORDER BY created_at DESC";

                $stmt = $conn->prepare($query);
                if (!$stmt) {
                    throw new Exception("Prepare statement for get_seller_transactions failed: " . $conn->errorInfo()[2]);
                }
                $stmt->execute($params);
                $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode([
                    'status' => 'success',
                    'transactions' => $transactions
                ]);
            } catch (PDOException $e) {
                file_put_contents('php_seller_dashboard_error_log.txt', "PDOException in get_seller_transactions: " . $e->getMessage() . "\n", FILE_APPEND);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Gagal mengambil riwayat transaksi penjual: ' . $e->getMessage()
                ]);
            }
            break;

        case 'get_recent_orders':
            // Fetch recent pending or processing orders (last 5)
            $sql = "SELECT o.id, o.created_at, o.total_harga, o.status,
                           GROUP_CONCAT(CONCAT(m.nama, ' (', oi.jumlah, ')') SEPARATOR ', ') as items_list
                    FROM orders o
                    JOIN order_items oi ON o.id = oi.order_id
                    JOIN menu m ON oi.menu_id = m.id
                    WHERE o.status = 'Menunggu' OR o.status = 'Diproses'
                    GROUP BY o.id
                    ORDER BY o.created_at DESC
                    LIMIT 5";
            
            $stmt = $conn->query($sql);
            if (!$stmt) {
                throw new Exception("Query for recent orders failed: " . $conn->errorInfo()[2]);
            }

            $orders = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                // Reconstruct items array for frontend compatibility
                $items_array = [];
                $item_strings = explode(', ', $row['items_list']);
                foreach ($item_strings as $item_str) {
                    preg_match('/(.*) \((.*)\)/', $item_str, $matches);
                    if (isset($matches[1]) && isset($matches[2])) {
                        $items_array[] = ['nama' => $matches[1], 'jumlah' => (int)$matches[2], 'harga_per_item' => 0]; // harga_per_item not needed here
                    }
                }

                $orders[] = [
                    'id' => $row['id'],
                    'time' => (new DateTime($row['created_at']))->format('H:i'),
                    'total' => floatval($row['total_harga']),
                    'status' => $row['status'],
                    'items' => $items_array
                ];
            }
            echo json_encode(['status' => 'success', 'orders' => $orders]);
            break;

        case 'get_summary':
            // Pending orders (status 'Diproses')
            $sqlPendingOrders = "SELECT o.id, o.total_harga
                                 FROM orders o
                                 WHERE o.status = 'Diproses'
                                 ORDER BY o.created_at ASC";
            $stmtPendingOrders = $conn->query($sqlPendingOrders);
            if (!$stmtPendingOrders) {
                throw new Exception("Query for pending orders failed: " . $conn->errorInfo()[2]);
            }
            $pendingOrders = [];
            while ($row = $stmtPendingOrders->fetch(PDO::FETCH_ASSOC)) {
                $pendingOrders[] = ['id' => $row['id'], 'total' => floatval($row['total_harga'])];
            }

            // Pending payments (status 'Menunggu')
            $sqlPendingPayments = "SELECT o.id, o.total_harga
                                   FROM orders o
                                   WHERE o.status = 'Menunggu'
                                   ORDER BY o.created_at ASC";
            $stmtPendingPayments = $conn->query($sqlPendingPayments);
            if (!$stmtPendingPayments) {
                throw new Exception("Query for pending payments failed: " . $conn->errorInfo()[2]);
            }
            $pendingPayments = [];
            while ($row = $stmtPendingPayments->fetch(PDO::FETCH_ASSOC)) {
                $pendingPayments[] = ['id' => $row['id'], 'total' => floatval($row['total_harga'])];
            }

            // Low stock items (stock < 3, status 'Ready')
            $sqlLowStock = "SELECT id, nama, stok FROM menu WHERE stok < 3 AND status = 'Ready' ORDER BY stok ASC";
            $stmtLowStock = $conn->query($sqlLowStock);
            if (!$stmtLowStock) {
                throw new Exception("Query for low stock menu failed: " . $conn->errorInfo()[2]);
            }
            $lowStockItems = [];
            while ($row = $stmtLowStock->fetch(PDO::FETCH_ASSOC)) {
                $lowStockItems[] = ['nama' => $row['nama'], 'stok' => (int)$row['stok']];
            }

            echo json_encode([
                'status' => 'success',
                'pending_orders' => $pendingOrders,
                'pending_payments' => $pendingPayments,
                'low_stock_items' => $lowStockItems
            ]);
            break;

        case 'update_order_status':
            if (!isset($data['order_id']) || !isset($data['status'])) {
                throw new Exception("Order ID atau status tidak lengkap.");
            }

            $orderId = $data['order_id'];
            $status = $data['status'];

            $validStatuses = ['Menunggu', 'Diproses', 'Siap Diambil', 'Selesai', 'Dibatalkan'];
            if (!in_array($status, $validStatuses)) {
                throw new Exception("Status tidak valid.");
            }

            $sql = "UPDATE orders SET status = ? WHERE id = ?";
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare statement for update status failed: " . $conn->errorInfo()[2]);
            }
            $stmt->execute([$status, $orderId]);
            
            if ($stmt->rowCount() === 0) {
                throw new Exception("Order tidak ditemukan atau status tidak berubah.");
            }
            echo json_encode(['status' => 'success', 'message' => 'Status pesanan berhasil diperbarui.']);
            break;

        default:
            throw new Exception("Aksi tidak dikenali: " . $action);
            break;
    }

} catch (Exception $e) {
    file_put_contents('php_seller_dashboard_error_log.txt', "Error: " . $e->getMessage() . "\n", FILE_APPEND);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
} 