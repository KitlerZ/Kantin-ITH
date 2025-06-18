<?php
include 'db.php';

try {
    // Add proof_image_path column to topup_requests table
    $sql = "ALTER TABLE topup_requests ADD COLUMN proof_image_path VARCHAR(255) NULL";
    $conn->exec($sql);
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Kolom proof_image_path berhasil ditambahkan ke tabel topup_requests'
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Gagal menambahkan kolom proof_image_path: ' . $e->getMessage()
    ]);
}
?> 