<?php
ini_set('display_errors', 0); // Disable error display for production
error_reporting(E_ALL); // Log all errors
ob_start(); // Start output buffering

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

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
    ob_clean(); // Clean any buffered output before sending error
    echo json_encode(['status' => 'error', 'message' => 'Koneksi database gagal.']);
    exit;
}

$input = file_get_contents("php://input");

// --- DEBUGGING START ---
// file_put_contents('php_input_log.txt', "\n---" . date('Y-m-d H:i:s') . "---\n", FILE_APPEND);
// file_put_contents('php_input_log.txt', "Raw Input: " . ($input ? $input : '[EMPTY]') . "\n", FILE_APPEND);
// --- DEBUGGING END ---

try {
    if (!$input) {
        throw new Exception("Tidak ada data yang dikirim");
    }

    $data = json_decode($input, true);

    // --- DEBUGGING START ---
    // file_put_contents('php_input_log.txt', "Decoded Data: " . print_r($data, true) . "\n", FILE_APPEND);
    // --- DEBUGGING END ---

    if (!is_array($data) || !isset($data['action'])) {
        throw new Exception("Format data tidak valid atau aksi tidak ditentukan");
    }

    $action = $data['action'] ?? '';

    // --- DEBUGGING START ---
    // file_put_contents('php_input_log.txt', "Action received: " . $action . "\n", FILE_APPEND);
    // --- DEBUGGING END ---

    switch ($action) {
        case 'login':
            if (!isset($data['username']) || !isset($data['password'])) {
                throw new Exception("Username atau password tidak lengkap.");
            }

            $username = $data['username'];
            $password = $data['password'];

            // Hash the input password with MD5 to compare with stored MD5 hash
            $hashedPassword = md5($password);

            $sql = "SELECT id, role, username FROM users WHERE username=? AND password=?";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$username, $hashedPassword]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user) {
                // Set session variables upon successful login
                $_SESSION['loggedInUserId'] = $user['id'];
                $_SESSION['loggedInUsername'] = $user['username'];
                $_SESSION['loggedInUserRole'] = $user['role'];

                ob_clean(); // Clean any buffered output before sending JSON
                echo json_encode([
                    "status" => "success", 
                    "role" => $user['role'], 
                    "userId" => $user['id'], 
                    "username" => $user['username']
                ]);
            } else {
                ob_clean(); // Clean any buffered output before sending JSON
                echo json_encode(["status" => "error", "message" => "Username atau password salah"]);
            }
            break;

        case 'logout':
            session_unset();
            session_destroy();
            ob_clean(); // Clean any buffered output before sending JSON
            echo json_encode(["status" => "success", "message" => "Logout berhasil!"]);
            exit;

        case 'reset':
            if (!isset($data['username']) || !isset($data['new_password'])) {
                throw new Exception("Username atau password baru tidak lengkap.");
            }

            $username = $data['username'];
            $new_password = $data['new_password'];

            $sql = "UPDATE users SET password=? WHERE username=?";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$new_password, $username]);

            if ($stmt->rowCount() > 0) {
                ob_clean(); // Clean any buffered output before sending JSON
                echo json_encode(["status" => "success", "message" => "Password berhasil direset"]);
            } else {
                ob_clean(); // Clean any buffered output before sending JSON
                echo json_encode(["status" => "error", "message" => "Username tidak ditemukan atau password tidak berubah"]);
            }
            break;

        case 'get_saldo':
            if (!isset($data['userId'])) {
                ob_clean();
                echo json_encode([
                    'status' => 'error',
                    'message' => 'User ID tidak ditemukan dalam permintaan.',
                    'saldo' => 0,
                    'balance' => 0
                ]);
                exit();
            }

            $userId = $data['userId'];
            $sql = "SELECT saldo FROM users WHERE id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user) {
                $saldo = floatval($user['saldo']);
                ob_clean();
                echo json_encode([
                    'status' => 'success',
                    'saldo' => $saldo,
                    'balance' => $saldo
                ]);
            } else {
                ob_clean();
                echo json_encode([
                    'status' => 'error',
                    'message' => 'User tidak ditemukan',
                    'saldo' => 0,
                    'balance' => 0
                ]);
            }
            break;

        case 'get_menu':
            try {
                // Mengambil nama penjual dari tabel users
                $sql = "SELECT m.id, m.nama, m.harga, m.kategori, m.stok, m.status, m.penjual_id, m.gambar, u.username AS nama_penjual FROM menu m LEFT JOIN users u ON m.penjual_id = u.id WHERE m.status='Ready' ORDER BY m.nama";
                $stmt = $conn->query($sql);

                if ($stmt) {
                    $menu = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    ob_clean();
                    echo json_encode([
                        'status' => 'success',
                        'menu' => $menu
                    ]);
                } else {
                    throw new Exception("Gagal mengambil data menu dari database: " . $conn->errorInfo()[2]);
                }
            } catch (Exception $e) {
                ob_clean();
                echo json_encode([
                    'status' => 'error',
                    'message' => $e->getMessage()
                ]);
            }
            break;

        case 'checkout':
            if (!isset($data['userId']) || !isset($data['items']) || !is_array($data['items']) || !isset($data['totalAmount'])) {
                throw new Exception("Data checkout tidak lengkap atau format salah.");
            }

            $userId = $data['userId'];
            $items = $data['items'];
            $totalAmount = floatval($data['totalAmount']);

            if (count($items) === 0) {
                throw new Exception("Keranjang kosong, tidak ada item untuk diproses.");
            }

            $conn->beginTransaction();

            try {
    
                $sqlSaldo = "SELECT saldo FROM users WHERE id = ?";
                $stmtSaldo = $conn->prepare($sqlSaldo);
                $stmtSaldo->execute([$userId]);
                $currentSaldo = $stmtSaldo->fetch(PDO::FETCH_ASSOC)['saldo'];

                if ($currentSaldo < $totalAmount) {
                    throw new Exception("Saldo tidak mencukupi.");
                }

    
                $sqlOrder = "INSERT INTO orders (pembeli_id, total_harga, status) VALUES (?, ?, 'Menunggu')";
                $stmtOrder = $conn->prepare($sqlOrder);
                $stmtOrder->execute([$userId, $totalAmount]);
                $orderId = $conn->lastInsertId();

        
                $sqlOrderItems = "INSERT INTO order_items (order_id, menu_id, jumlah, subtotal) VALUES (?, ?, ?, ?)";
                $stmtOrderItems = $conn->prepare($sqlOrderItems);

                foreach ($items as $item) {
                    $menuId = intval($item['id']);
                    $jumlah = intval($item['jumlah']);
                    $subtotal = floatval($item['total']);
                    $stmtOrderItems->execute([$orderId, $menuId, $jumlah, $subtotal]);
                }

                $newSaldo = $currentSaldo - $totalAmount;
                $sqlUpdateSaldo = "UPDATE users SET saldo = ? WHERE id = ?";
                $stmtUpdateSaldo = $conn->prepare($sqlUpdateSaldo);
                $stmtUpdateSaldo->execute([$newSaldo, $userId]);
                error_log("DEBUG: User saldo updated. New saldo: " . $newSaldo);

                foreach ($items as $item) {
                    $menuId = intval($item['id']);
                    $subtotal = floatval($item['total']);
                    
                    $sqlGetSeller = "SELECT penjual_id FROM menu WHERE id = ?";
                    $stmtGetSeller = $conn->prepare($sqlGetSeller);
                    $stmtGetSeller->execute([$menuId]);
                    $seller = $stmtGetSeller->fetch(PDO::FETCH_ASSOC);
                    
                    if ($seller) {
                        $sqlGetSellerSaldo = "SELECT saldo FROM users WHERE id = ?";
                        $stmtGetSellerSaldo = $conn->prepare($sqlGetSellerSaldo);
                        $stmtGetSellerSaldo->execute([$seller['penjual_id']]);
                        $sellerSaldo = $stmtGetSellerSaldo->fetch(PDO::FETCH_ASSOC)['saldo'];

                        $newSellerSaldo = $sellerSaldo + $subtotal;
                        $sqlUpdateSellerSaldo = "UPDATE users SET saldo = ? WHERE id = ?";
                        $stmtUpdateSellerSaldo = $conn->prepare($sqlUpdateSellerSaldo);
                        $stmtUpdateSellerSaldo->execute([$newSellerSaldo, $seller['penjual_id']]);
                        error_log("DEBUG: Seller saldo updated. Seller ID: " . $seller['penjual_id'] . ", New saldo: " . $newSellerSaldo);

                        // Tambahkan transaksi saldo untuk penjual
                        $sqlInsertTrans = "INSERT INTO transactions (user_id, jenis, jumlah, keterangan, created_at) VALUES (?, 'masuk', ?, ?, NOW())";
                        $stmtInsertTrans = $conn->prepare($sqlInsertTrans);
                        $keterangan = 'Pembayaran dari Order #' . $orderId;
                        $stmtInsertTrans->execute([$seller['penjual_id'], $subtotal, $keterangan]);
                    }
                }

                $conn->commit();

                ob_clean(); // Clean any buffered output before sending JSON
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Pesanan berhasil dibuat',
                    'orderId' => $orderId,
                    'newBalance' => $newSaldo
                ]);
            } catch (Exception $e) {
                $conn->rollBack();
                ob_clean(); // Clean any buffered output before sending JSON
                echo json_encode(["status" => "error", "message" => "Checkout gagal: " . $e->getMessage()]);
            }
            break;

        default:
            ob_clean(); // Clean any buffered output before sending JSON
            echo json_encode(["status" => "error", "message" => "Aksi tidak valid"]);
            break;
    }

} catch (Exception $e) {
    ob_clean(); // Clean any buffered output before sending JSON
    error_log("Exception in login.php: " . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => 'Terjadi kesalahan internal: ' . $e->getMessage()]);
}

ob_end_flush(); // End output buffering and send remaining output
exit; // Ensure no further output

?>