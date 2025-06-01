<?php
ob_start();
$host = 'localhost';
$user = 'root';
$pass = '';
$db   = 'kantin_ith';

try {
    $conn = new mysqli($host, $user, $pass, $db);
    
    if ($conn->connect_error) {
        throw new Exception("Koneksi database gagal: " . $conn->connect_error);
    }
} catch (Exception $e) {
    ob_end_clean(); 
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
    exit;
}
?>
