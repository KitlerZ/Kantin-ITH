<?php
header("Content-Type: application/json");
include 'db.php';

$data = json_decode(file_get_contents("php://input"), true);
$username = $conn->real_escape_string($data['username']);
$new_password = $conn->real_escape_string($data['new_password']);

$sql = "UPDATE users SET password='$new_password' WHERE username='$username'";
$conn->query($sql);

if ($conn->affected_rows > 0) {
    echo json_encode(["status" => "success", "message" => "Password berhasil direset."]);
} else {
    echo json_encode(["status" => "error", "message" => "Username tidak ditemukan."]);
}
?>
