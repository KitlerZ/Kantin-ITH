
<?php
session_start();
include 'db.php';

header("Content-Type: application/json");

$input = json_decode(file_get_contents("php://input"), true);
$total = $input['total'] ?? 0;
$user_id = $_SESSION['user_id'] ?? 0;

if ($user_id == 0) {
  echo json_encode(["status" => "failed", "message" => "User tidak valid"]);
  exit;
}

$query = $conn->query("SELECT saldo FROM users WHERE id = $user_id");
if ($query && $query->num_rows > 0) {
    $row = $query->fetch_assoc();
    $saldo = $row['saldo'];

    if ($saldo >= $total) {
        $conn->query("UPDATE users SET saldo = saldo - $total WHERE id = $user_id");

        echo json_encode(["status" => "success", "message" => "Pesanan berhasil"]);
    } else {
        echo json_encode(["status" => "failed", "message" => "Saldo tidak cukup"]);
    }
} else {
    echo json_encode(["status" => "failed", "message" => "User tidak ditemukan"]);
}
?>
