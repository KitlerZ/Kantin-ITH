<?php
include 'db.php';

header('Content-Type: application/json');

try {
    // Buat tabel users jika belum ada
    $sql = "CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'pembeli', 'seller') NOT NULL DEFAULT 'pembeli',
        saldo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";
    
    if ($conn->query($sql) === TRUE) {
        // Modifikasi kolom role jika tabel sudah ada
        $sql = "ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'pembeli', 'seller') NOT NULL DEFAULT 'pembeli'";
        $conn->query($sql);
        
        echo json_encode([
            'success' => true,
            'message' => "Tabel users berhasil dibuat atau sudah ada"
        ]);
    } else {
        throw new Exception("Error creating table: " . $conn->error);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?> 