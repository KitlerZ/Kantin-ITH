<?php
header("Content-Type: application/json");
include 'db.php';

// Get input data
$input = file_get_contents("php://input");
$data = json_decode($input, true);

// Validate input
if (!$data || !isset($data['userId']) || !isset($data['amount'])) {
    echo json_encode([
        "status" => "error",
        "message" => "Data tidak lengkap"
    ]);
    exit;
}

$userId = $conn->real_escape_string($data['userId']);
$amount = floatval($data['amount']);

// Validate amount
if ($amount <= 0) {
    echo json_encode([
        "status" => "error",
        "message" => "Jumlah top-up harus lebih dari 0"
    ]);
    exit;
}

// Start transaction
$conn->begin_transaction();

try {
    // Check if user exists
    $checkSql = "SELECT id FROM users WHERE id = '$userId'";
    $checkResult = $conn->query($checkSql);
    
    if (!$checkResult || $checkResult->num_rows === 0) {
        throw new Exception("User tidak ditemukan");
    }

    // Update saldo
    $updateSql = "UPDATE users SET saldo = saldo + $amount WHERE id = '$userId'";
    if (!$conn->query($updateSql)) {
        throw new Exception("Gagal mengupdate saldo: " . $conn->error);
    }

    // Get new saldo
    $getSaldoSql = "SELECT saldo FROM users WHERE id = '$userId'";
    $saldoResult = $conn->query($getSaldoSql);
    $user = $saldoResult->fetch_assoc();

    // Commit transaction
    $conn->commit();

    echo json_encode([
        "status" => "success",
        "message" => "Top-up berhasil",
        "new_saldo" => floatval($user['saldo'])
    ]);

} catch (Exception $e) {
    // Rollback transaction on error
    $conn->rollback();
    
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}

$conn->close();
?> 