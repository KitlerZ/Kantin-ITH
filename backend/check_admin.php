<?php
include 'db.php';

try {
    // Check admin users
    echo "=== Checking Admin Users ===\n";
    $stmt = $conn->query("SELECT id, username, role, saldo FROM users WHERE role = 'admin'");
    $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Admin users found:\n";
    print_r($admins);

    // Check table structure
    echo "\n=== Checking Users Table Structure ===\n";
    $stmt = $conn->query("DESCRIBE users");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Users table columns:\n";
    print_r($columns);

    // Check recent transactions
    echo "\n=== Checking Recent Transactions ===\n";
    $stmt = $conn->query("SELECT * FROM transactions WHERE jenis = 'pemasukan_komisi' ORDER BY created_at DESC LIMIT 5");
    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Recent commission transactions:\n";
    print_r($transactions);

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
} 