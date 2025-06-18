<?php
ob_start();
header('Content-Type: application/json');

include_once 'db.php';

$raw_input = file_get_contents('php://input');
error_log("Admin Manage Bills - Raw input: " . $raw_input);
$input = json_decode($raw_input, true);
$action = $input['action'] ?? '';

error_log("Admin Manage Bills - Parsed action: " . $action);
error_log("Admin Manage Bills - Full input data: " . print_r($input, true));

$response = ['status' => 'error', 'message' => 'Aksi tidak valid.'];

try {
    switch ($action) {
        case 'add_bill':
            $response = add_bill($conn);
            break;
        case 'get_all_bills':
            $response = get_all_bills($conn);
            break;
        case 'update_bill_status':
            $response = update_bill_status($conn);
            break;
        default:
            break;
    }
} catch (Exception $e) {
    error_log("Exception in admin_manage_bills.php: " . $e->getMessage());
    $response = ['status' => 'error', 'message' => 'Terjadi kesalahan internal: ' . $e->getMessage()];
}

ob_end_clean();
echo json_encode($response);
exit;

function add_bill($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $seller_id = $data['seller_id'] ?? 0;
    $total = $data['total'] ?? 0;
    $periode_bulan = $data['periode_bulan'] ?? 0;
    $periode_tahun = $data['periode_tahun'] ?? 0;

    error_log("Add Bill: Received data: " . print_r($data, true));

    if (empty($seller_id) || empty($total) || empty($periode_bulan) || empty($periode_tahun)) {
        error_log("Add Bill Error: Missing required fields.");
        return ['status' => 'error', 'message' => 'Semua bidang harus diisi.'];
    }

    $sql = "INSERT INTO seller_bills (penjual_id, total, periode_bulan, periode_tahun, status, tanggal) VALUES (?, ?, ?, ?, 'pending', CURRENT_DATE())";
    $stmt = $conn->prepare($sql);

    if ($stmt === false) {
        error_log("Add Bill Error: Prepare failed: " . print_r($conn->errorInfo(), true));
        return ['status' => 'error', 'message' => 'Gagal menyiapkan statement SQL.'];
    }

    // Check for PDO errors during bind and execute
    try {
        if ($stmt->execute([$seller_id, $total, $periode_bulan, $periode_tahun])) {
            error_log("Add Bill: Success for seller_id: " . $seller_id);
            return ['status' => 'success', 'message' => 'Tagihan berhasil ditambahkan.'];
        } else {
            $error_info = $stmt->errorInfo();
            error_log("Add Bill Error: Execute failed: " . print_r($error_info, true));
            return ['status' => 'error', 'message' => 'Gagal menambahkan tagihan: ' . ($error_info[2] ?? 'Unknown error')];
        }
    } catch (PDOException $e) {
        error_log("Add Bill PDO Exception: " . $e->getMessage());
        return ['status' => 'error', 'message' => 'Terjadi kesalahan database: ' . $e->getMessage()];
    }
}

function get_all_bills($conn) {
    $sql = "SELECT t.*, u.username as seller_username FROM seller_bills t JOIN users u ON t.penjual_id = u.id ORDER BY t.tanggal DESC";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $bills = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return ['status' => 'success', 'bills' => $bills];
}

function update_bill_status($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $bill_id = $data['bill_id'] ?? 0;
    $new_status = $data['new_status'] ?? '';

    if (empty($bill_id) || empty($new_status)) {
        return ['status' => 'error', 'message' => 'ID Tagihan dan Status baru harus diisi.'];
    }

    // Optional: Add validation for new_status if needed
    if (!in_array($new_status, ['pending', 'paid'])) {
        return ['status' => 'error', 'message' => 'Status tidak valid.'];
    }

    $sql = "UPDATE seller_bills SET status = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    if ($stmt->execute([$new_status, $bill_id])) {
        return ['status' => 'success', 'message' => 'Status tagihan berhasil diperbarui.'];
    } else {
        return ['status' => 'error', 'message' => 'Gagal memperbarui status tagihan: ' . $stmt->errorInfo()[2]];
    }
}

$conn->close(); 