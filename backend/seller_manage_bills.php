<?php
ob_start();
header('Content-Type: application/json');

include_once 'db.php';

$raw_input = file_get_contents('php://input');
error_log("Seller Manage Bills - Raw input: " . $raw_input);
$input = json_decode($raw_input, true);
$action = $input['action'] ?? '';

error_log("Seller Manage Bills - Parsed action: " . $action);
error_log("Seller Manage Bills - Full input data: " . print_r($input, true));

$response = ['status' => 'error', 'message' => 'Aksi tidak valid.'];

try {
    switch ($action) {
        case 'get_my_bills':
            $response = get_my_bills($conn);
            break;
        case 'pay_bill':
            $response = pay_bill($conn);
            break;
        default:
            break;
    }
} catch (Exception $e) {
    error_log("Exception in seller_manage_bills.php: " . $e->getMessage());
    $response = ['status' => 'error', 'message' => 'Terjadi kesalahan internal: ' . $e->getMessage()];
}

ob_end_clean();
echo json_encode($response);
exit;

function get_my_bills($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $seller_id = $data['seller_id'] ?? 0;

    if (empty($seller_id)) {
        return ['status' => 'error', 'message' => 'ID Penjual tidak ditemukan.'];
    }

    $sql = "SELECT * FROM seller_bills WHERE penjual_id = ? ORDER BY tanggal DESC";
    $stmt = $conn->prepare($sql);
    $stmt->execute([$seller_id]);
    $bills = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return ['status' => 'success', 'bills' => $bills];
}

function pay_bill($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $bill_id = $data['bill_id'] ?? 0;
    $seller_id = $data['seller_id'] ?? 0;

    if (empty($bill_id) || empty($seller_id)) {
        return ['status' => 'error', 'message' => 'ID Tagihan atau ID Penjual tidak ditemukan.'];
    }

    // Start transaction
    $conn->beginTransaction();

    try {
        // 1. Get bill details
        $stmt = $conn->prepare("SELECT total, status FROM seller_bills WHERE id = ? AND penjual_id = ?");
        $stmt->execute([$bill_id, $seller_id]);
        $bill = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$bill) {
            $conn->rollBack();
            return ['status' => 'error', 'message' => 'Tagihan tidak ditemukan atau bukan milik Anda.'];
        }

        if ($bill['status'] === 'paid') {
            $conn->rollBack();
            return ['status' => 'error', 'message' => 'Tagihan sudah lunas.'];
        }

        $bill_amount = $bill['total'];

        // 2. Get seller current saldo
        $stmt = $conn->prepare("SELECT saldo FROM users WHERE id = ? AND role = 'seller'");
        $stmt->execute([$seller_id]);
        $seller = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$seller) {
            $conn->rollBack();
            return ['status' => 'error', 'message' => 'Pengguna penjual tidak ditemukan.'];
        }

        $seller_saldo = $seller['saldo'];

        if ($seller_saldo < $bill_amount) {
            $conn->rollBack();
            return ['status' => 'error', 'message' => 'Saldo tidak mencukupi.'];
        }

        // 3. Deduct from seller's saldo
        $new_seller_saldo = $seller_saldo - $bill_amount;
        $stmt = $conn->prepare("UPDATE users SET saldo = ? WHERE id = ?");
        $stmt->execute([$new_seller_saldo, $seller_id]);

        // Debugging: Log the amount deducted from seller
        error_log("PayBill: Saldo penjual " . $seller_id . " dikurangi sebesar: " . $bill_amount . ", Saldo baru: " . $new_seller_saldo);

        // 4. Add to admin's saldo
        // Menggunakan ID admin yang benar (misal ID 4 untuk admin1)
        $admin_id_to_update = 4; // Mengubah ini menjadi ID admin yang benar (sesuai database Anda)
        
        // Debugging: Log before admin saldo update
        error_log("PayBill: Mencoba memperbarui saldo admin. Jumlah: " . $bill_amount . ", Target Admin ID: " . $admin_id_to_update);

        $stmt = $conn->prepare("UPDATE users SET saldo = saldo + ? WHERE id = ? AND role = 'admin'");
        $stmt->execute([$bill_amount, $admin_id_to_update]);

        // Debugging: Log after admin saldo update
        error_log("PayBill: Kueri pembaruan saldo admin dieksekusi.");

        // 5. Update bill status to 'paid' and set dibayar timestamp
        $stmt = $conn->prepare("UPDATE seller_bills SET status = 'paid', dibayar = NOW() WHERE id = ?");
        $stmt->execute([$bill_id]);

        $conn->commit();
        error_log("PayBill: Transaksi pembayaran tagihan berhasil di-commit untuk bill ID: " . $bill_id);
        return ['status' => 'success', 'message' => 'Tagihan berhasil dibayar.', 'new_saldo' => $new_seller_saldo];
    } catch (PDOException $e) {
        $conn->rollBack();
        error_log("PDOException di pay_bill: " . $e->getMessage());
        return ['status' => 'error', 'message' => 'Kesalahan database saat memproses pembayaran.'];
    } catch (Exception $e) {
        $conn->rollBack();
        error_log("Exception di pay_bill: " . $e->getMessage());
        return ['status' => 'error', 'message' => 'Terjadi kesalahan internal saat memproses pembayaran.'];
    }
}

$conn->close(); 