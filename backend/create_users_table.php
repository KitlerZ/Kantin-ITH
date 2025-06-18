<?php
require_once 'db.php';

$sql = "CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'seller', 'buyer') NOT NULL,
    saldo DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";

if ($conn->query($sql) === TRUE) {
    $sql = "ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'seller', 'buyer') NOT NULL";
    $conn->query($sql);
    echo "Table users created successfully";
} else {
    echo "Error creating table: " . $conn->error;
}

$conn->close();
?> 