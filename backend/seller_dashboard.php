<?php
ob_start(); // Start output buffering at the very beginning
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include 'db.php';

// Ensure database connection is valid
if (!isset($conn) || !$conn) {
    file_put_contents('php_seller_dashboard_log.txt', "Database connection failed in seller_dashboard.php\n", FILE_APPEND);
    ob_clean(); // Clean any buffered output before sending JSON
    echo json_encode(['status' => 'error', 'message' => 'Koneksi database gagal.']);
    exit;
}

$input = file_get_contents("php://input");

// --- DEBUGGING START ---
file_put_contents('php_seller_dashboard_log.txt', "\n---" . date('Y-m-d H:i:s') . "---\n", FILE_APPEND);
file_put_contents('php_seller_dashboard_log.txt', "Raw Input: " . ($input ? $input : '[EMPTY]') . "\n", FILE_APPEND);
// --- DEBUGGING END ---

try {
    if (!$input) {
        throw new Exception("Tidak ada data yang dikirim");
    }

    $data = json_decode($input, true);

    // --- DEBUGGING START ---
    file_put_contents('php_seller_dashboard_log.txt', "Decoded Data: " . print_r($data, true) . "\n", FILE_APPEND);
    // --- DEBUGGING END ---

    if (!is_array($data) || !isset($data['action'])) {
        throw new Exception("Format data tidak valid atau aksi tidak ditentukan");
    }

    $action = $data['action'] ?? '';

    // --- DEBUGGING START ---
    file_put_contents('php_seller_dashboard_log.txt', "Action received: " . $action . "\n", FILE_APPEND);
    // --- DEBUGGING END ---

    switch ($action) {
        case 'get_stats':
            $userId = $data['userId'] ?? null; // Pastikan userId diambil
            if (empty($userId)) {
                throw new Exception("User ID penjual tidak ditemukan.");
            }
            $today = date('Y-m-d');
            
            // Ambil saldo penjual
            $stmt = $conn->prepare("SELECT saldo FROM users WHERE id = ?");
            if (!$stmt) { throw new Exception("Prepare statement for saldo failed: " . $conn->errorInfo()[2]); }
            $stmt->execute([$userId]);
            $saldo = $stmt->fetch(PDO::FETCH_ASSOC)['saldo'] ?? 0;

            // Total Pesanan Hari Ini (Completed Orders for Today) - Filter berdasarkan penjual
            $stmt = $conn->prepare("SELECT COUNT(*) as total_orders FROM orders o JOIN order_items oi ON o.id = oi.order_id JOIN menu m ON oi.menu_id = m.id WHERE DATE(o.created_at) = ? AND o.status = 'Selesai' AND m.penjual_id = ? GROUP BY m.penjual_id");
            if (!$stmt) { throw new Exception("Prepare statement failed: " . $conn->errorInfo()[2]); }
            $stmt->execute([$today, $userId]);
            $todayOrders = $stmt->fetch(PDO::FETCH_ASSOC)['total_orders'] ?? 0;

            // Jumlah Menu Ready (Active Menu) - Filter berdasarkan penjual
            $stmt = $conn->prepare("SELECT COUNT(*) as active_menu FROM menu WHERE status = 'Ready' AND penjual_id = ?");
            if (!$stmt) { throw new Exception("Prepare statement failed: " . $conn->errorInfo()[2]); }
            $stmt->execute([$userId]);
            $activeMenu = $stmt->fetch(PDO::FETCH_ASSOC)['active_menu'] ?? 0;

            // Transaksi Terkonfirmasi (Confirmed Transactions - Assuming Completed Orders) - Filter berdasarkan penjual
            $stmt = $conn->prepare("SELECT COUNT(DISTINCT o.id) as confirmed_transactions FROM orders o JOIN order_items oi ON o.id = oi.order_id JOIN menu m ON oi.menu_id = m.id WHERE o.status = 'Selesai' AND m.penjual_id = ?");
            if (!$stmt) { throw new Exception("Prepare statement failed: " . $conn->errorInfo()[2]); }
            $stmt->execute([$userId]);
            $confirmedTransactions = $stmt->fetch(PDO::FETCH_ASSOC)['confirmed_transactions'] ?? 0;

            // Low Stock Items (Assuming stock < 3) - Filter berdasarkan penjual
            $stmt = $conn->prepare("SELECT COUNT(*) as low_stock_count FROM menu WHERE stok < 3 AND status = 'Ready' AND penjual_id = ?");
            if (!$stmt) { throw new Exception("Prepare statement failed: " . $conn->errorInfo()[2]); }
            $stmt->execute([$userId]);
            $lowStockCount = $stmt->fetch(PDO::FETCH_ASSOC)['low_stock_count'] ?? 0;

            ob_clean(); // Clean any buffered output
            echo json_encode([
                'status' => 'success',
                'saldo' => floatval($saldo), // Menambahkan saldo
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
            if (!$stmt) { throw new Exception("Prepare statement for get_seller_saldo failed: " . $conn->errorInfo()[2]); }
            $stmt->execute([$userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user) {
                ob_clean(); // Clean any buffered output
                echo json_encode(['status' => 'success', 'saldo' => floatval($user['saldo'])]);
            } else {
                ob_clean(); // Clean any buffered output
                echo json_encode(['status' => 'error', 'message' => 'User tidak ditemukan']);
            }
            break;

        case 'get_seller_transactions':
            if (!isset($data['userId'])) {
                ob_clean(); // Clean any buffered output
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
                if (!$stmt) { throw new Exception("Prepare statement for get_seller_transactions failed: " . $conn->errorInfo()[2]); }
                $stmt->execute($params);
                $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

                ob_clean(); // Clean any buffered output
                echo json_encode([
                    'status' => 'success',
                    'transactions' => $transactions
                ]);
            } catch (PDOException $e) {
                file_put_contents('php_seller_dashboard_error_log.txt', "PDOException in get_seller_transactions: " . $e->getMessage() . "\n", FILE_APPEND);
                ob_clean(); // Clean any buffered output
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Gagal mengambil riwayat transaksi penjual: ' . $e->getMessage()
                ]);
            }
            break;

        case 'get_recent_orders':
            if (!isset($data['userId'])) {
                throw new Exception("User ID penjual tidak ditemukan dalam permintaan.");
            }
            
            $sellerId = $data['userId'];
            
            // Fetch recent pending or processing orders (last 5)
            $sql = "SELECT o.id, o.created_at, o.status,
                           SUM(oi.subtotal) as seller_order_total,
                           GROUP_CONCAT(CONCAT(m.nama, ' (', oi.jumlah, ')') SEPARATOR ', ') as items_list,
                           u.username AS pembeli_username /* Mengubah nama alias di sini */
                    FROM orders o
                    JOIN order_items oi ON o.id = oi.order_id
                    JOIN menu m ON oi.menu_id = m.id
                    JOIN users u ON o.pembeli_id = u.id
                    WHERE (o.status = 'Menunggu' OR o.status = 'Diproses')
                    AND m.penjual_id = ?
                    GROUP BY o.id
                    ORDER BY o.created_at DESC
                    LIMIT 5";
            
            $stmt = $conn->prepare($sql);
            if (!$stmt) { throw new Exception("Query for recent orders failed: " . $conn->errorInfo()[2]); }
            $stmt->execute([$sellerId]);

            $orders = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $items_array = [];
                $item_strings = explode(', ', $row['items_list']);
                foreach ($item_strings as $item_str) {
                    preg_match('/(.*) \((.*)\)/', $item_str, $matches);
                    if (isset($matches[1]) && isset($matches[2])) {
                        $items_array[] = ['nama' => $matches[1], 'jumlah' => (int)$matches[2]];
                    }
                }

                $orders[] = [
                    'id' => $row['id'],
                    'time' => (new DateTime($row['created_at']))->format('H:i'),
                    'total' => floatval($row['seller_order_total']),
                    'status' => $row['status'],
                    'items' => $items_array,
                    'pembeli_username' => $row['pembeli_username'] // Menggunakan nama alias baru
                ];
            }
            echo json_encode(['status' => 'success', 'orders' => $orders]);
            break;

        case 'get_summary':
            if (!isset($data['userId'])) {
                throw new Exception("User ID penjual tidak ditemukan dalam permintaan.");
            }
            
            $sellerId = $data['userId'];
            

            $sqlPendingOrders = "SELECT o.id, o.total_harga
                                 FROM orders o
                                 JOIN order_items oi ON o.id = oi.order_id
                                 JOIN menu m ON oi.menu_id = m.id
                                 WHERE o.status = 'Diproses'
                                 AND m.penjual_id = ?
                                 GROUP BY o.id
                                 ORDER BY o.created_at ASC";
            $stmtPendingOrders = $conn->prepare($sqlPendingOrders);
            if (!$stmtPendingOrders) { throw new Exception("Query for pending orders failed: " . $conn->errorInfo()[2]); }
            $stmtPendingOrders->execute([$sellerId]);
            $pendingOrders = [];
            while ($row = $stmtPendingOrders->fetch(PDO::FETCH_ASSOC)) {
                $pendingOrders[] = ['id' => $row['id'], 'total' => floatval($row['total_harga'])];
            }


            $sqlPendingPayments = "SELECT o.id, o.total_harga
                                   FROM orders o
                                   JOIN order_items oi ON o.id = oi.order_id
                                   JOIN menu m ON oi.menu_id = m.id
                                   WHERE o.status = 'Menunggu'
                                   AND m.penjual_id = ?
                                   GROUP BY o.id
                                   ORDER BY o.created_at ASC";
            $stmtPendingPayments = $conn->prepare($sqlPendingPayments);
            if (!$stmtPendingPayments) { throw new Exception("Query for pending payments failed: " . $conn->errorInfo()[2]); }
            $stmtPendingPayments->execute([$sellerId]);
            $pendingPayments = [];
            while ($row = $stmtPendingPayments->fetch(PDO::FETCH_ASSOC)) {
                $pendingPayments[] = ['id' => $row['id'], 'total' => floatval($row['total_harga'])];
            }


            $sqlLowStock = "SELECT id, nama, stok FROM menu WHERE stok < 3 AND status = 'Ready' AND penjual_id = ? ORDER BY stok ASC";
            $stmtLowStock = $conn->prepare($sqlLowStock);
            if (!$stmtLowStock) { throw new Exception("Query for low stock menu failed: " . $conn->errorInfo()[2]); }
            $stmtLowStock->execute([$sellerId]);
            $lowStockItems = [];
            while ($row = $stmtLowStock->fetch(PDO::FETCH_ASSOC)) {
                $lowStockItems[] = ['nama' => $row['nama'], 'stok' => (int)$row['stok']];
            }

            ob_clean();
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
            if (!$stmt) { throw new Exception("Prepare statement for update status failed: " . $conn->errorInfo()[2]); }
            $stmt->execute([$status, $orderId]);
            
            if ($stmt->rowCount() === 0) {
                throw new Exception("Order tidak ditemukan atau status tidak berubah.");
            }
            echo json_encode(['status' => 'success', 'message' => 'Status pesanan berhasil diperbarui.']);
            break;

        default:
            // Log the unknown action for debugging
            file_put_contents('php_seller_dashboard_log.txt', "Unknown action: " . $action . "\n", FILE_APPEND);
            throw new Exception("Aksi tidak valid.");
    }
} catch (Exception $e) {
    error_log("seller_dashboard.php Error: " . $e->getMessage());
    ob_clean(); // Ensure no partial output is sent
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}

?>