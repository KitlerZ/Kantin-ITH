<?php
ob_start(); // Start output buffering
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");
include 'db.php'; // Include your database connection file

// AMANKAN INPUT
$input = file_get_contents("php://input");

if (!$input) {
    ob_end_clean(); // Clean buffer before JSON output
    echo json_encode(["status" => "error", "message" => "Tidak ada data yang dikirim"]);
    exit;
}

$data = json_decode($input, true);

// Pastikan $data adalah array dan 'action' ada
if (!is_array($data) || !isset($data['action'])) {
    ob_end_clean(); // Clean buffer before JSON output
    echo json_encode(["status" => "error", "message" => "Format data tidak valid atau aksi tidak ditentukan"]);
    exit;
}

$action = $data['action'] ?? '';

try {
    // === GET ALL USERS ===
    if ($action === 'get_all_users') {
        // Ambil semua pengguna dari tabel users
        $sql = "SELECT id, username, role, saldo FROM users"; // Sesuaikan dengan nama tabel dan kolom Anda
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

        ob_end_clean(); // Clean buffer before JSON output
        echo json_encode([
            "status" => "success",
            "users" => $users
        ]);

    // === ADD MORE ADMIN ACTIONS HERE (e.g., update_saldo, delete_user) ===


    } else {
        throw new Exception("Aksi tidak valid.");
    }

} catch (Exception $e) {
    ob_end_clean(); // Clean buffer before JSON output
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}

// Pastikan koneksi ditutup di akhir
if ($conn) {
    $conn->close();
}
?> 