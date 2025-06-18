<?php
session_start();
require_once 'db.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Ensure database connection is valid
if (!isset($conn) || !$conn) {
    // Log the error if logging is enabled
    // file_put_contents('php_topup_log.txt', "Database connection failed in topup.php\n", FILE_APPEND);
    echo json_encode(['status' => 'error', 'message' => 'Koneksi database gagal.']);
    exit;
}

$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!isset($data['action'])) {
    echo json_encode(['status' => 'error', 'message' => 'Aksi tidak ditemukan']);
    exit();
}

try {
    switch ($data['action']) {
        case 'get_topup_history':
            if (!isset($data['userId'])) {
                throw new Exception('User ID tidak ditemukan dalam permintaan.');
            }

            $userId = $data['userId'];
            $sql = "SELECT id, jumlah, status, created_at FROM topup_requests WHERE pembeli_id = ? ORDER BY created_at DESC";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$userId]);
            
            $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Ensure amounts are float for frontend compatibility
            $formattedHistory = array_map(function($item) {
                $item['amount'] = floatval($item['jumlah']);
                unset($item['jumlah']);
                return $item;
            }, $history);

            echo json_encode([
                'status' => 'success',
                'history' => $formattedHistory
            ]);
            break;

        case 'submit_topup_request':
            if (!isset($data['userId']) || !isset($data['amount'])) {
                throw new Exception('Data top up tidak lengkap.');
            }

            $userId = $data['userId'];
            $jumlah = floatval($data['amount']);

            // Log input data for debugging
            error_log("Topup Request - User ID: " . $userId . ", Amount: " . $jumlah . ", Status: menunggu");

            if ($jumlah < 10000) {
                throw new Exception('Jumlah top up minimal Rp 10.000');
            }

            $sql = "INSERT INTO topup_requests (pembeli_id, jumlah, status) VALUES (?, ?, ?)";
            $stmt = $conn->prepare($sql);
            
            if ($stmt->execute([$userId, $jumlah, 'menunggu'])) {
                // Log success
                error_log("Topup Request - INSERT successful for User ID: " . $userId);
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Permintaan top up berhasil dibuat'
                ]);
            } else {
                // Log error details
                error_log("Topup Request - INSERT failed for User ID: " . $userId . ": " . implode(" ", $stmt->errorInfo()));
                throw new Exception("Gagal membuat permintaan top up: " . $stmt->errorInfo()[2]);
            }
            break;

        default:
            throw new Exception("Aksi tidak dikenali");
    }
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}

// PDO connections close automatically, so no need for explicit $conn->close();
?> 