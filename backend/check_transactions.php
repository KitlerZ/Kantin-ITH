<?php
include 'db.php';

try {
    // Check transactions table structure
    echo "=== Checking Transactions Table Structure ===\n";
    $stmt = $conn->query("DESCRIBE transactions");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Transactions table columns:\n";
    print_r($columns);

    // Check recent transactions
    echo "\n=== Checking Recent Transactions ===\n";
    $stmt = $conn->query("SELECT t.*, u.username, u.role 
                         FROM transactions t 
                         JOIN users u ON t.user_id = u.id 
                         ORDER BY t.created_at DESC 
                         LIMIT 10");
    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Recent transactions:\n";
    print_r($transactions);

    // Check total commission transactions
    echo "\n=== Checking Commission Transactions ===\n";
    $stmt = $conn->query("SELECT COUNT(*) as total, SUM(jumlah) as total_amount 
                         FROM transactions 
                         WHERE jenis = 'pemasukan_komisi'");
    $commission = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Commission transactions summary:\n";
    print_r($commission);

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
} 