CREATE TABLE IF NOT EXISTS topup_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    jumlah DECIMAL(10,2) NOT NULL,
    metode VARCHAR(50) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Add user_id to orders table and create foreign key constraint
ALTER TABLE orders
ADD COLUMN user_id INT NOT NULL,
ADD CONSTRAINT fk_orders_users
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE CASCADE ON UPDATE CASCADE; 