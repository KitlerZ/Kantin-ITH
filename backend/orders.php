<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

ob_start();

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include 'db.php';

if (!isset($conn) || !$conn) {
    file_put_contents('php_orders_log.txt', "Database connection failed in orders.php\n", FILE_APPEND);
    ob_clean();
    echo json_encode(['status' => 'error', 'message' => 'Koneksi database gagal.']);
    exit;
}

$input = file_get_contents("php://input");


file_put_contents('php_orders_log.txt', "\n---" . date('Y-m-d H:i:s') . "---\n", FILE_APPEND);
file_put_contents('php_orders_log.txt', "Raw Input: " . ($input ? $input : '[EMPTY]') . "\n", FILE_APPEND);

try {
    if (!$input) {
        throw new Exception("Tidak ada data yang dikirim");
    }

    $data = json_decode($input, true);


    file_put_contents('php_orders_log.txt', "Decoded Data: " . print_r($data, true) . "\n", FILE_APPEND);

    if (!is_array($data) || !isset($data['action'])) {
        throw new Exception("Format data tidak valid atau aksi tidak ditentukan");
    }

    $action = $data['action'] ?? '';

    file_put_contents('php_orders_log.txt', "Action received: " . $action . "\n", FILE_APPEND);

    switch ($action) {
        case 'get_seller_orders':
            $sellerId = $data['userId'] ?? '';
            $filterStatus = $data['filterStatus'] ?? 'all';
            $filterDate = $data['filterDate'] ?? '';
            $searchQuery = $data['searchQuery'] ?? '';

            if (empty($sellerId)) {
                ob_clean();
                echo json_encode([
                    'status' => 'error',
                    'message' => 'User ID penjual tidak ditemukan'
                ]);
                exit;
            }

            try {
                $query = "SELECT o.id, o.created_at, o.status, 
                               SUM(oi.subtotal) as seller_order_total,
                               GROUP_CONCAT(m.nama, '|', oi.jumlah, '|', oi.subtotal) as items_list,
                               p.username as pembeli_username
                        FROM orders o
                        JOIN order_items oi ON o.id = oi.order_id
                        JOIN menu m ON oi.menu_id = m.id
                        JOIN users p ON o.pembeli_id = p.id 
                        WHERE m.penjual_id = ?";

                $params = [$sellerId];

                if ($filterStatus !== 'all') {
                    $query .= " AND o.status = ?";
                    $params[] = $filterStatus;
                }

                if (!empty($filterDate)) {
                    $query .= " AND DATE(o.created_at) = ?";
                    $params[] = $filterDate;
                }

                if (!empty($searchQuery)) {
                    $query .= " AND (o.id LIKE ? OR m.nama LIKE ?)";
                    $params[] = "%$searchQuery%";
                    $params[] = "%$searchQuery%";
                }

                // Add limit for recent orders if passed
                if (isset($data['limit']) && is_numeric($data['limit'])) {
                    $query .= " GROUP BY o.id ORDER BY o.created_at DESC LIMIT ?";
                    $params[] = (int)$data['limit'];
                } else {
                    $query .= " GROUP BY o.id ORDER BY o.created_at DESC";
                }

                $stmt = $conn->prepare($query);
                $stmt->execute($params);
                $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $formattedOrders = array_map(function($order) use ($conn) {
                    $items_array = [];
                    if (!empty($order['items_list'])) {
                        $item_strings = explode(',', $order['items_list']);
                        foreach ($item_strings as $item_str) {
                            $parts = explode('|', $item_str);
                            if (count($parts) === 3) {
                                list($name, $quantity, $price) = $parts;
                                $items_array[] = [
                                    'nama' => $name,
                                    'jumlah' => (int)$quantity,
                                    'harga_per_item' => (float)$price
                                ];
                            }
                        }
                    }
                    unset($order['items_list']);
                    return [
                        'id' => $order['id'],
                        'created_at' => $order['created_at'], 
                        'total' => floatval($order['seller_order_total']),
                        'status' => $order['status'],
                        'items' => $items_array,
                        'pembeli_name' => $order['pembeli_username']
                    ];
                }, $orders);

                ob_clean();
                echo json_encode([
                    'status' => 'success',
                    'orders' => $formattedOrders
                ]);
                exit;
            } catch (PDOException $e) {
                ob_clean();
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Gagal mengambil riwayat pesanan penjual: ' . $e->getMessage()
                ]);
                exit;
            }
            break;

        case 'update_order_status':
            $orderId = $data['orderId'] ?? '';
            $newStatus = $data['newStatus'] ?? '';

            if (empty($orderId) || empty($newStatus)) {
                ob_clean(); 
                echo json_encode([
                    'status' => 'error',
                    'message' => 'ID Pesanan atau Status baru tidak ditemukan'
                ]);
                exit;
            }

            try {
                $stmt = $conn->prepare("UPDATE orders SET status = ? WHERE id = ?");
                $stmt->execute([$newStatus, $orderId]);

                // Jika status diubah menjadi Selesai, insert transaksi saldo penjual dan hitung komisi admin
                if (strtolower($newStatus) === 'selesai') {
                    file_put_contents('php_orders_log.txt', "\n=== Processing Order #$orderId ===\n", FILE_APPEND);
                    
                    // Ambil penjual_id, total_harga, dan pembeli_id dari order terkait
                    $stmtOrder = $conn->prepare("SELECT o.total_harga, o.pembeli_id, m.penjual_id FROM orders o JOIN order_items oi ON o.id = oi.order_id JOIN menu m ON oi.menu_id = m.id WHERE o.id = ? LIMIT 1");
                    $stmtOrder->execute([$orderId]);
                    $orderData = $stmtOrder->fetch(PDO::FETCH_ASSOC);

                    if ($orderData) {
                        $penjualId = $orderData['penjual_id'];
                        $totalHarga = $orderData['total_harga'];
                        $pembeliId = $orderData['pembeli_id'];

                        file_put_contents('php_orders_log.txt', "Order Data:\n", FILE_APPEND);
                        file_put_contents('php_orders_log.txt', "Total Harga: $totalHarga\n", FILE_APPEND);
                        file_put_contents('php_orders_log.txt', "Pembeli ID: $pembeliId\n", FILE_APPEND);
                        file_put_contents('php_orders_log.txt', "Penjual ID: $penjualId\n", FILE_APPEND);

                        // Calculate commission (5% for admin, 95% for seller)
                        $adminCommission = $totalHarga * 0.05;
                        $sellerAmount = $totalHarga * 0.95;

                        file_put_contents('php_orders_log.txt', "Calculations:\n", FILE_APPEND);
                        file_put_contents('php_orders_log.txt', "Admin Commission (5%): $adminCommission\n", FILE_APPEND);
                        file_put_contents('php_orders_log.txt', "Seller Amount (95%): $sellerAmount\n", FILE_APPEND);

                        // Get admin ID from database
                        $stmtGetAdmin = $conn->prepare("SELECT id, username, saldo FROM users WHERE role = 'admin' LIMIT 1");
                        $stmtGetAdmin->execute();
                        $adminData = $stmtGetAdmin->fetch(PDO::FETCH_ASSOC);
                        
                        if ($adminData) {
                            $adminUserId = $adminData['id'];
                            $adminUsername = $adminData['username'];
                            $adminCurrentSaldo = $adminData['saldo'];
                            
                            file_put_contents('php_orders_log.txt', "Admin Found:\n", FILE_APPEND);
                            file_put_contents('php_orders_log.txt', "ID: $adminUserId\n", FILE_APPEND);
                            file_put_contents('php_orders_log.txt', "Username: $adminUsername\n", FILE_APPEND);
                            file_put_contents('php_orders_log.txt', "Current Saldo: $adminCurrentSaldo\n", FILE_APPEND);

                            // Update admin's saldo
                            $stmtUpdateAdminSaldo = $conn->prepare("UPDATE users SET saldo = saldo + ? WHERE id = ?");
                            $result = $stmtUpdateAdminSaldo->execute([$adminCommission, $adminUserId]);
                            
                            if ($result) {
                                file_put_contents('php_orders_log.txt', "Successfully updated admin saldo\n", FILE_APPEND);
                                
                                // Verify the update
                                $stmtVerify = $conn->prepare("SELECT saldo FROM users WHERE id = ?");
                                $stmtVerify->execute([$adminUserId]);
                                $newSaldo = $stmtVerify->fetchColumn();
                                file_put_contents('php_orders_log.txt', "New admin saldo: $newSaldo\n", FILE_APPEND);
                            } else {
                                file_put_contents('php_orders_log.txt', "Failed to update admin saldo\n", FILE_APPEND);
                            }

                            // Update seller's saldo
                            $stmtUpdateSellerSaldo = $conn->prepare("UPDATE users SET saldo = saldo + ? WHERE id = ?");
                            $result = $stmtUpdateSellerSaldo->execute([$sellerAmount, $penjualId]);
                            
                            if ($result) {
                                file_put_contents('php_orders_log.txt', "Successfully updated seller saldo\n", FILE_APPEND);
                            } else {
                                file_put_contents('php_orders_log.txt', "Failed to update seller saldo\n", FILE_APPEND);
                            }

                            // Insert transactions
                            try {
                                // Masukkan transaksi saldo penjual (95% dari total)
                                $keteranganSeller = "Pemasukan dari Order #$orderId (setelah komisi admin)";
                                $stmtTransSeller = $conn->prepare("INSERT INTO transactions (user_id, jenis, jumlah, keterangan, created_at) VALUES (?, 'pemasukan', ?, ?, NOW())");
                                $stmtTransSeller->execute([$penjualId, $sellerAmount, $keteranganSeller]);

                                // Masukkan transaksi komisi admin (5% dari total)
                                $keteranganAdmin = "Komisi dari Order #$orderId (pembeli_id: {$pembeliId})";
                                $stmtTransAdmin = $conn->prepare("INSERT INTO transactions (user_id, jenis, jumlah, keterangan, created_at) VALUES (?, 'pemasukan_komisi', ?, ?, NOW())");
                                $stmtTransAdmin->execute([$adminUserId, $adminCommission, $keteranganAdmin]);
                                
                                file_put_contents('php_orders_log.txt', "Successfully inserted both transactions\n", FILE_APPEND);
                            } catch (PDOException $e) {
                                file_put_contents('php_orders_log.txt', "Error inserting transactions: " . $e->getMessage() . "\n", FILE_APPEND);
                            }
                        } else {
                            file_put_contents('php_orders_log.txt', "ERROR: No admin user found in database!\n", FILE_APPEND);
                        }
                    } else {
                        file_put_contents('php_orders_log.txt', "ERROR: Order data not found!\n", FILE_APPEND);
                    }
                }

                if ($stmt->rowCount() > 0) {
                    ob_clean(); 
                    echo json_encode([
                        'status' => 'success',
                        'message' => 'Status pesanan berhasil diperbarui'
                    ]);
                } else {
                    ob_clean(); 
                    echo json_encode([
                        'status' => 'error',
                        'message' => 'Gagal memperbarui status pesanan atau pesanan tidak ditemukan'
                    ]);
                }
            } catch (PDOException $e) {
                file_put_contents('php_orders_log.txt', "PDOException in update_order_status: " . $e->getMessage() . "\n", FILE_APPEND);
                ob_clean(); 
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Gagal memperbarui status pesanan: ' . $e->getMessage()
                ]);
            }
            break;

        case 'get_order_history':
            $userId = $data['userId'] ?? '';
            $status = $data['status'] ?? 'all';
            $date = $data['date'] ?? '';

            if (empty($userId)) {
                ob_clean();
                echo json_encode([
                    'status' => 'error',
                    'message' => 'User ID tidak ditemukan'
                ]);
                exit;
            }

            try {
                $query = "SELECT o.*, 
                                 GROUP_CONCAT(m.nama, '|', oi.jumlah, '|', oi.subtotal, '|', u.id, '|', u.username SEPARATOR ';;') as items_info 
                         FROM orders o 
                         LEFT JOIN order_items oi ON o.id = oi.order_id 
                         LEFT JOIN menu m ON oi.menu_id = m.id 
                         LEFT JOIN users u ON m.penjual_id = u.id 
                         WHERE o.pembeli_id = ?";
                $params = [$userId];

                if ($status !== 'all') {
                    $query .= " AND o.status = ?";
                    $params[] = $status;
                }

                if (!empty($date)) {
                    $query .= " AND DATE(o.created_at) = ?";
                    $params[] = $date;
                }

                $query .= " GROUP BY o.id ORDER BY o.created_at DESC";

                $stmt = $conn->prepare($query);
                $stmt->execute($params);
                $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $formattedOrders = array_map(function($order) {
                    $items = [];
                    if (!empty($order['items_info'])) {
                        $itemList = explode(';;', $order['items_info']);
                        foreach ($itemList as $item) {
                            list($name, $quantity, $price, $sellerId, $sellerName) = explode('|', $item);
                            $items[] = [
                                'name' => $name,
                                'quantity' => (int)$quantity,
                                'price' => (float)$price,
                                'seller_id' => (int)$sellerId,
                                'seller_name' => $sellerName
                            ];
                        }
                    }
                    unset($order['items_info']);
                    return [
                        'id' => $order['id'],
                        'created_at' => $order['created_at'],
                        'total_amount' => floatval($order['total_harga']),
                        'status' => $order['status'],
                        'items' => $items
                    ];
                }, $orders);

                ob_clean();
                echo json_encode([
                    'status' => 'success',
                    'orders' => $formattedOrders
                ]);
                exit;
            } catch (PDOException $e) {
                ob_clean();
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Gagal mengambil riwayat pesanan: ' . $e->getMessage()
                ]);
                exit;
            }
            break;

        case 'get_order_detail':
            $orderId = $data['orderId'] ?? '';
            $sellerId = $data['sellerId'] ?? '';

            if (empty($orderId) || empty($sellerId)) {
                ob_clean();
                echo json_encode([
                    'status' => 'error',
                    'message' => 'ID Pesanan atau ID Penjual tidak ditemukan'
                ]);
                exit;
            }

            try {
                // Fetch order details including only items from the specific seller
                $query = "SELECT o.id, o.created_at, o.status,
                                 SUM(oi.subtotal) as seller_order_total, 
                                 GROUP_CONCAT(m.nama, '|', oi.jumlah, '|', oi.subtotal) as items_info 
                          FROM orders o 
                          JOIN order_items oi ON o.id = oi.order_id 
                          JOIN menu m ON oi.menu_id = m.id 
                          WHERE o.id = ? AND m.penjual_id = ?
                          GROUP BY o.id";
                $stmt = $conn->prepare($query);
                $stmt->execute([$orderId, $sellerId]);
                $order = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($order) {
                    $items = [];
                    if (!empty($order['items_info'])) {
                        $itemList = explode(',', $order['items_info']);
                        foreach ($itemList as $item) {
                            list($name, $quantity, $price) = explode('|', $item);
                            $items[] = [
                                'nama' => $name,
                                'jumlah' => (int)$quantity,
                                'price' => (float)$price
                            ];
                        }
                    }

                    ob_clean();
                    echo json_encode([
                        'status' => 'success',
                        'order' => [
                            'id' => $order['id'],
                            'created_at' => $order['created_at'],
                            'status' => $order['status'],
                            'total' => floatval($order['seller_order_total']),
                            'items' => $items
                        ]
                    ]);
                    exit;
                } else {
                    ob_clean();
                    echo json_encode([
                        'status' => 'error',
                        'message' => 'Detail pesanan tidak ditemukan atau tidak relevan untuk penjual ini.'
                    ]);
                    exit;
                }
            } catch (PDOException $e) {
                ob_clean();
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Gagal mengambil detail pesanan: ' . $e->getMessage()
                ]);
                exit;
            }
            break;

        default:
            ob_clean(); // Clean any buffered output
            echo json_encode([
                'status' => 'error',
                'message' => 'Aksi tidak dikenali'
            ]);
            break;
    }
} catch (Exception $e) {
    ob_clean(); // Clean any buffered output
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
// Remove closing PHP tag to prevent any accidental output 