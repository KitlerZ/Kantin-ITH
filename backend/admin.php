<?php
ob_start();
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");
include 'db.php';

$input = file_get_contents("php://input");

if (!$input) {
    ob_end_clean();
    echo json_encode(["status" => "error", "message" => "Tidak ada data yang dikirim"]);
    exit;
}

$data = json_decode($input, true);

if (!is_array($data) || !isset($data['action'])) {
    ob_end_clean();
    echo json_encode(["status" => "error", "message" => "Format data tidak valid atau aksi tidak ditentukan"]);
    exit;
}

$action = $data['action'] ?? '';

try {
    if ($action === 'get_all_users') {
        $sql = "SELECT id, username, role, saldo FROM users";
        $result = $conn->query($sql);

        if (!$result) {
            throw new Exception("Query untuk mengambil data pengguna gagal: " . $conn->error);
        }

        $users = [];
        while ($row = $result->fetch_assoc()) {
            $users[] = [
                'id' => $row['id'],
                'username' => $row['username'],
                'role' => $row['role'],
                'saldo' => floatval($row['saldo'])
            ];
        }

        ob_end_clean();
        echo json_encode([
            "status" => "success",
            "users" => $users
        ]);

    } else {
        throw new Exception("Aksi tidak valid.");
    }

} catch (Exception $e) {
    ob_end_clean();
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}

if ($conn) {
    $conn->close();
}
?>
