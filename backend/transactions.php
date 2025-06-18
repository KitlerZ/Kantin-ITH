<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

include 'db.php';

header('Content-Type: application/json');

// Read the input stream for POST requests (especially for JSON payloads)
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Debugging: Log raw input and decoded data
file_put_contents('php_debug_transactions.log', "\n---" . date('Y-m-d H:i:s') . "---\n", FILE_APPEND);
file_put_contents('php_debug_transactions.log', "Raw Input: " . $input . "\n", FILE_APPEND);
file_put_contents('php_debug_transactions.log', "Decoded Data: " . print_r($data, true) . "\n", FILE_APPEND);
file_put_contents('php_debug_transactions.log', "_POST: " . print_r($_POST, true) . "\n", FILE_APPEND);

$action = $_POST['action'] ?? ($data['action'] ?? '');

file_put_contents('php_debug_transactions.log', "Action: " . $action . "\n", FILE_APPEND);

try {
    if (!isset($conn) || !$conn) {
        throw new Exception('Koneksi database gagal.');
    }

    switch ($action) {
        case 'get_transactions':
            $userId = $_POST['userId'] ?? ($data['userId'] ?? null);
            file_put_contents('php_debug_transactions.log', "UserID: " . $userId . "\n", FILE_APPEND);

            if (empty($userId)) {
                throw new Exception('User ID tidak ditemukan.');
            }

            $sql = "SELECT id, jenis, jumlah, keterangan, created_at FROM transactions WHERE user_id = ? ORDER BY created_at DESC";
            $stmt = $conn->prepare($sql);
            
            if (!$stmt) {
                throw new Exception("Prepare statement failed: " . implode(" ", $conn->errorInfo()));
            }
            
            $stmt->execute([$userId]);
            $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'status' => 'success',
                'transactions' => $transactions
            ]);
            break;

        default:
            throw new Exception('Aksi tidak valid.');
    }
} catch (Exception $e) {
    error_log("transactions.php Error: " . $e->getMessage());
    file_put_contents('php_debug_transactions.log', "Error: " . $e->getMessage() . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}

?> 