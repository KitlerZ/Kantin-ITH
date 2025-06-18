<?php
include 'db.php';

try {
    // Create seller_bills table
    $sql = "CREATE TABLE IF NOT EXISTS seller_bills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        seller_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        period_month INT NOT NULL,
        period_year INT NOT NULL,
        status ENUM('pending', 'paid') DEFAULT 'pending',
        due_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        paid_at TIMESTAMP NULL,
        FOREIGN KEY (seller_id) REFERENCES users(id)
    )";
    
    $conn->exec($sql);
    echo "Table seller_bills created successfully";
} catch(PDOException $e) {
    echo "Error creating table: " . $e->getMessage();
} 