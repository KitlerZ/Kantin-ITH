<?php
ob_start(); // Start output buffering
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
    ob_end_clean(); // Clean any output before sending JSON
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
    exit;
}
?>
