<?php
require_once 'db.php'; // Menggunakan db.php karena terlihat ada di root backend/

$sql = "CREATE TABLE IF NOT EXISTS topup_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    buyer_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    proof_image_path VARCHAR(255) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approval_date TIMESTAMP NULL,
    FOREIGN KEY (buyer_id) REFERENCES users(id)
)";

if ($conn->query($sql) === TRUE) {
    echo "Table topup_requests created successfully";
} else {
    echo "Error creating table: " . $conn->error;
}

$conn->close();
?> 