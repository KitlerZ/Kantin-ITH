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

    if ($action === 'get_pending_topups') {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            throw new Exception('Metode permintaan tidak diizinkan untuk top up pending. Gunakan GET.');
        }
        $stmt = $conn->prepare("SELECT tr.id, tr.pembeli_id, u.username, tr.jumlah, tr.created_at FROM topup_requests tr JOIN users u ON tr.pembeli_id = u.id WHERE tr.status = 'menunggu' ORDER BY tr.created_at DESC");
        if (!$stmt) {
            throw new Exception('Gagal menyiapkan statement database untuk top up pending.');
        }
        if (!$stmt->execute()) {
            throw new Exception('Gagal mengambil top up pending: ' . implode(" ", $stmt->errorInfo()));
        }
        $pendingTopups = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $response = ['status' => 'success', 'data' => $pendingTopups];
    } else if ($action === 'get_all_topups') {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            throw new Exception('Metode permintaan tidak diizinkan untuk semua riwayat top up. Gunakan GET.');
        }
        $stmt = $conn->prepare("SELECT tr.id, tr.pembeli_id, u.username, tr.jumlah, tr.status, tr.created_at FROM topup_requests tr JOIN users u ON tr.pembeli_id = u.id ORDER BY tr.created_at DESC");
        if (!$stmt) {
            throw new Exception('Gagal menyiapkan statement database untuk semua riwayat.');
        }
        if (!$stmt->execute()) {
            throw new Exception('Gagal mengambil semua riwayat top up: ' . implode(" ", $stmt->errorInfo()));
        }
        $allTopups = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $response = ['status' => 'success', 'data' => $allTopups];
    } else if ($action === 'update_topup_status') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            throw new Exception('Metode permintaan tidak diizinkan untuk update status top up. Gunakan POST.');
        }
        $topupId = $_POST['topupId'] ?? '';
        $newStatus = $_POST['newStatus'] ?? '';

        if (empty($topupId) || !in_array($newStatus, ['disetujui', 'ditolak'])) {
            throw new Exception('Data tidak lengkap atau status tidak valid.');
        }

        // Start transaction
        $conn->beginTransaction();

        try {
            // Update topup request status
            $stmt = $conn->prepare("UPDATE topup_requests SET status = ? WHERE id = ?");
            if (!$stmt) {
                throw new Exception('Gagal menyiapkan statement update status.');
            }
            if (!$stmt->execute([$newStatus, $topupId])) {
                throw new Exception('Gagal mengupdate status top up: ' . implode(" ", $stmt->errorInfo()));
            }

            if ($newStatus === 'disetujui') {
                // Get topup amount and user ID
                $stmt = $conn->prepare("SELECT jumlah, pembeli_id FROM topup_requests WHERE id = ?");
                if (!$stmt) {
                    throw new Exception('Gagal menyiapkan statement ambil jumlah.');
                }
                if (!$stmt->execute([$topupId])) {
                    throw new Exception('Gagal mengambil jumlah top up: ' . implode(" ", $stmt->errorInfo()));
                }
                $topupDetails = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$topupDetails) {
                    throw new Exception('Detail top up tidak ditemukan.');
                }

                $amount = $topupDetails['jumlah'];
                $pembeliId = $topupDetails['pembeli_id'];

                // Update user's saldo
                $stmt = $conn->prepare("UPDATE users SET saldo = saldo + ? WHERE id = ?");
                if (!$stmt) {
                    throw new Exception('Gagal menyiapkan statement update saldo.');
                }
                if (!$stmt->execute([$amount, $pembeliId])) {
                    throw new Exception('Gagal mengupdate saldo pengguna: ' . implode(" ", $stmt->errorInfo()));
                }
            }

            $conn->commit();
            $response = ['status' => 'success', 'message' => 'Status top up berhasil diperbarui.'];

        } catch (Exception $e) {
            $conn->rollBack();
            throw $e; // Re-throw to be caught by outer catch block
        }
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