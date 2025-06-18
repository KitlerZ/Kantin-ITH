<?php
// Prevent any output before JSON response
ob_start();

// Disable error display to prevent HTML output
ini_set('display_errors', 1); // Aktifkan display errors untuk debugging
error_reporting(E_ALL);

require_once 'db.php';

// Set JSON header
header('Content-Type: application/json');

// Initialize response array
$response = ['status' => 'error', 'message' => 'Terjadi kesalahan tak dikenal.'];

try {
    // Check request method and action
    $action = $_REQUEST['action'] ?? ''; // Use $_REQUEST to get action from GET or POST

    if ($action === 'get_topup_history') {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            throw new Exception('Metode permintaan tidak diizinkan untuk riwayat top up. Gunakan GET.');
        }
        $userId = $_GET['userId'] ?? '';
        if (empty($userId)) {
            throw new Exception('ID pengguna tidak ditemukan.');
        }
        $stmt = $conn->prepare("SELECT id, jumlah, status, created_at FROM topup_requests WHERE pembeli_id = ? ORDER BY created_at DESC");
        if (!$stmt) {
            throw new Exception('Gagal menyiapkan statement database untuk riwayat.');
        }
        if (!$stmt->execute([$userId])) {
            throw new Exception('Gagal mengambil riwayat top up: ' . implode(" ", $stmt->errorInfo()));
        }
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $response = ['status' => 'success', 'data' => $history];
        echo json_encode($response);
        exit();
    } else {
        throw new Exception('Aksi tidak valid.');
    }

} catch (Exception $e) {
    $response['message'] = $e->getMessage();
} catch (Error $e) {
    $response['message'] = 'Terjadi kesalahan sistem: ' . $e->getMessage();
}

// Clear any output buffer
ob_end_clean();

// Send JSON response
echo json_encode($response);
exit();
?> 