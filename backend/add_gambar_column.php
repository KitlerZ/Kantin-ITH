<?php
include 'db.php';

try {
    // Add gambar column to menu table
    $sql = "ALTER TABLE menu ADD COLUMN gambar VARCHAR(255)";
    $conn->exec($sql);
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Kolom gambar berhasil ditambahkan ke tabel menu'
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Gagal menambahkan kolom gambar: ' . $e->getMessage()
    ]);
}
?> 