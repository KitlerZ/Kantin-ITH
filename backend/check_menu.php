<?php
include 'db.php';

header('Content-Type: application/json');

if ($conn->connect_error) {
    die(json_encode([
        'success' => false,
        'message' => "Koneksi database gagal: " . $conn->connect_error
    ]));
}

$result = $conn->query("SHOW TABLES LIKE 'menu'");
if ($result->num_rows === 0) {
    die(json_encode([
        'success' => false,
        'message' => "Tabel 'menu' tidak ditemukan"
    ]));
}

$result = $conn->query("SELECT * FROM menu");
$menu = [];
while ($row = $result->fetch_assoc()) {
    $menu[] = $row;
}

echo json_encode([
    'success' => true,
    'total_items' => count($menu),
    'menu' => $menu
]);
?> 
