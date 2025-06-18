<?php
header("Content-Type: application/json");
include 'db.php';

$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data || !isset($data['userId']) || !isset($data['amount'])) {
    echo json_encode([
        "status" => "error",
        "message" => "Data tidak lengkap"
    ]);
    exit;
}

$userId = intval($data['userId']);
$amount = floatval($data['amount']);

if ($amount < 10000) {
    echo json_encode([
        "status" => "error",
        "message" => "Jumlah top-up minimal Rp 10.000"
    ]);
    exit;
}

$conn->begin_transaction();

try {
    // Check if user exists
    $checkSql = "SELECT id FROM users WHERE id = ?";
    $checkStmt = $conn->prepare($checkSql);
    if (!$checkStmt) {
        throw new Exception("Gagal menyiapkan query: " . $conn->error);
    }
    
    $checkStmt->bind_param("i", $userId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        throw new Exception("User tidak ditemukan");
    }
    $checkStmt->close();

    // Update saldo
    $updateSql = "UPDATE users SET saldo = saldo + ? WHERE id = ?";
    $updateStmt = $conn->prepare($updateSql);
    if (!$updateStmt) {
        throw new Exception("Gagal menyiapkan query update: " . $conn->error);
    }
    
    $updateStmt->bind_param("di", $amount, $userId);
    if (!$updateStmt->execute()) {
        throw new Exception("Gagal mengupdate saldo: " . $updateStmt->error);
    }
    $updateStmt->close();

    // Get updated saldo
    $getSaldoSql = "SELECT saldo FROM users WHERE id = ?";
    $getSaldoStmt = $conn->prepare($getSaldoSql);
    if (!$getSaldoStmt) {
        throw new Exception("Gagal menyiapkan query get saldo: " . $conn->error);
    }
    
    $getSaldoStmt->bind_param("i", $userId);
    $getSaldoStmt->execute();
    $saldoResult = $getSaldoStmt->get_result();
    $user = $saldoResult->fetch_assoc();
    $getSaldoStmt->close();

    $conn->commit();

    echo json_encode([
        "status" => "success",
        "message" => "Top-up berhasil",
        "new_saldo" => floatval($user['saldo'])
    ]);

} catch (Exception $e) {
    $conn->rollback();
    
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}

$conn->close();
?> 