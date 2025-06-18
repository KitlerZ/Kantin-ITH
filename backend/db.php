<?php
ob_start();
$host = 'localhost';
$user = 'root';
$pass = '';
$db   = 'kantin_ith';

try {
    $dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    $conn = new PDO($dsn, $user, $pass, $options);
    
} catch (PDOException $e) {
    ob_end_clean(); 
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Koneksi database gagal: ' . $e->getMessage()
    ]);
    exit;
}
