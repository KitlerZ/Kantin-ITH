<?php
include 'db.php';

header('Content-Type: application/json');

try {
    // Hapus data lama (opsional)
    $conn->query("TRUNCATE TABLE users");
    
    // Data pengguna contoh
    $users = [
        [
            'username' => 'admin1',
            'password' => 'admin123',
            'role' => 'admin',
            'saldo' => 0
        ],
        [
            'username' => 'pembeli1',
            'password' => 'pembeli123',
            'role' => 'pembeli',
            'saldo' => 100000
        ],
        [
            'username' => 'seller1',
            'password' => 'seller123',
            'role' => 'seller',
            'saldo' => 0
        ]
    ];
    
    // Insert data pengguna
    $stmt = $conn->prepare("INSERT INTO users (username, password, role, saldo) VALUES (?, ?, ?, ?)");
    
    foreach ($users as $user) {
        $stmt->bind_param("sssd", $user['username'], $user['password'], $user['role'], $user['saldo']);
        $stmt->execute();
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Data pengguna contoh berhasil ditambahkan'
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

mysqli_close($conn);
?> 