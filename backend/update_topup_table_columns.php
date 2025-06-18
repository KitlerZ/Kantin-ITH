<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once 'db.php';

$response = ['success' => false, 'message' => 'Terjadi kesalahan tak dikenal.'];

$sqls = [
    "ALTER TABLE topup_requests ADD COLUMN approval_date TIMESTAMP NULL AFTER created_at",
    "ALTER TABLE topup_requests ADD COLUMN admin_notes TEXT NULL AFTER approval_date",
    "ALTER TABLE topup_requests ADD COLUMN proof_image_path VARCHAR(255) NULL AFTER jumlah"
];

foreach ($sqls as $sql) {
    if ($conn->query($sql) === TRUE) {
        echo "\nQuery berhasil: " . $sql;
    } else {
        if ($conn->errno == 1060) { // Error 1060: Duplicate column name
            echo "\nKolom sudah ada, lewati: " . $sql;
        } else {
            echo "\nError menjalankan query: " . $sql . " - " . $conn->error;
        }
    }
}

$conn->close();
?> 