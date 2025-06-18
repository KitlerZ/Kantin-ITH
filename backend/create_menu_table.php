<?php
include 'db.php';

header('Content-Type: application/json');

try {
 
    $sql = "CREATE TABLE IF NOT EXISTS menu (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        harga INT NOT NULL,
        kategori VARCHAR(50) NOT NULL,
        stok INT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'Ready',
        penjual_id INT NOT NULL,
        gambar VARCHAR(255),
        FOREIGN KEY (penjual_id) REFERENCES users(id)
    )";
    
    if ($conn->query($sql) === TRUE) {
        echo json_encode([
            'success' => true,
            'message' => "Tabel menu berhasil dibuat atau sudah ada"
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