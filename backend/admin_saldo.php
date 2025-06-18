<?php
ob_start(); // Start output buffering
session_start();
header('Content-Type: application/json'); // Ensure JSON header is always sent
require_once 'db.php'; // This establishes $conn as a PDO object

// $conn is already established by db.php

$raw_input = file_get_contents('php://input');
error_log("Admin Saldo - Raw input: " . $raw_input); // Log raw input
$input = json_decode($raw_input, true);
$action = $input['action'] ?? ''; // Get action from JSON input

error_log("Admin Saldo - Parsed action: " . $action); // Log parsed action
error_log("Admin Saldo - Full input data: " . print_r($input, true)); // Log full input array

$response = ['status' => 'error', 'message' => 'Aksi tidak valid.'];

try {
    switch ($action) {
        case 'get_admin_saldo':
            $userId = $_SESSION['loggedInUserId'] ?? 0; // Mengambil user ID dari sesi yang benar
            $response = getAdminSaldo($conn, $userId);
            break;
            
        case 'get_admin_stats':
            $response = getAdminStats($conn);
            break;
            
        case 'get_admin_transactions':
            $filterType = $input['filterType'] ?? 'all';
            $filterPeriod = $input['filterPeriod'] ?? 'all';
            $filterRole = $input['filterRole'] ?? 'all'; // Get filterRole from JSON input
            $response = getAdminTransactions($conn, $filterType, $filterPeriod, $filterRole);
            break;

        case 'logout': // Handle logout action
            session_unset();
            session_destroy();
            $response = ['status' => 'success', 'message' => 'Logged out successfully'];
            break;
            
        default:
            // Default error message already set
            break;
    }
} catch (Exception $e) {
    error_log("Exception in admin_saldo.php: " . $e->getMessage());
    $response = ['status' => 'error', 'message' => 'Terjadi kesalahan internal: ' . $e->getMessage()];
}

ob_end_clean(); // Clear any accidental output before sending JSON
echo json_encode($response);
exit; // Ensure no further output

function getAdminSaldo($conn, $userId) {
    try {
        $sql = "SELECT saldo FROM users WHERE id = ? AND role = 'admin'"; 
        $stmt = $conn->prepare($sql);
        $stmt->execute([$userId]); // Execute with parameters for PDO
        $row = $stmt->fetch(PDO::FETCH_ASSOC); // Use PDO fetch

        return ['status' => 'success', 'saldo' => $row['saldo'] ?? 0];
    } catch (Exception $e) {
        error_log("Error in getAdminSaldo: " . $e->getMessage());
        return ['status' => 'error', 'message' => 'Gagal mengambil saldo admin: ' . $e->getMessage()];
    }
}

function getAdminStats($conn) {
    try {
        // Get total income from transactions where jenis is 'pemasukan_komisi'
        $stmt = $conn->query("SELECT COALESCE(SUM(jumlah), 0) as total FROM transactions WHERE jenis = 'pemasukan_komisi'");
        $row = $stmt->fetch(PDO::FETCH_ASSOC); // Use PDO fetch
        $totalIncome = $row['total'] ?? 0;
        
        // Get total transactions count
        $stmt = $conn->query("SELECT COUNT(*) as total FROM transactions WHERE jenis = 'pemasukan_komisi'");
        $row = $stmt->fetch(PDO::FETCH_ASSOC); // Use PDO fetch
        $totalTransactions = $row['total'] ?? 0;
        
        return [
            'status' => 'success',
            'totalIncome' => $totalIncome,
            'totalTransactions' => $totalTransactions
        ];

    } catch (Exception $e) {
        error_log("Error in getAdminStats: " . $e->getMessage());
        return ['status' => 'error', 'message' => 'Gagal mengambil statistik: ' . $e->getMessage()];
    }
}

function getAdminTransactions($conn, $filterType = 'all', $filterPeriod = 'all', $filterRole = 'all') {
    $whereClause = " WHERE t.jenis = 'pemasukan_komisi'";
    $params = [];
    
    // Filter by type (income/expense - though all here are income for admin)
    if ($filterType !== 'all') {
        // Assuming 'income' or 'expense' will be passed, though current design only shows income for admin
        if ($filterType === 'income') {
            $whereClause .= " AND t.jenis = 'pemasukan_komisi'";
        } else if ($filterType === 'expense') {
            // Add conditions for expense if applicable in your transaction table
            $whereClause .= " AND t.jenis = 'pengeluaran'"; // Example
        }
    }

    if ($filterPeriod !== 'all') {
        switch ($filterPeriod) {
            case 'today':
                $whereClause .= " AND DATE(t.created_at) = CURDATE()";
                break;
            case 'week':
                $whereClause .= " AND YEARWEEK(t.created_at) = YEARWEEK(CURDATE())";
                break;
            case 'month':
                $whereClause .= " AND MONTH(t.created_at) = MONTH(CURDATE()) AND YEAR(t.created_at) = YEAR(CURDATE())";
                break;
            case 'year': // Add year filter
                $whereClause .= " AND YEAR(t.created_at) = YEAR(CURDATE())";
                break;
        }
    }

    if ($filterRole !== 'all') {
        // Join with users table and filter by role if filterRole is specified
        // Note: This assumes 'user_id' in transactions table links to 'id' in users table
        $whereClause .= " AND u.role = ?";
        $params[] = $filterRole;
    }
    
    $sql = "SELECT t.*, u.username, u.role as user_role 
              FROM transactions t 
              LEFT JOIN users u ON t.user_id = u.id" . 
              $whereClause . 
              " ORDER BY t.created_at DESC";
    
    try {
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        
        $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC); // Use PDO fetchAll

        $formattedTransactions = array();
        foreach ($transactions as $row) {
            $formattedTransactions[] = array(
                'id' => $row['id'],
                'title' => $row['keterangan'],
                'amount' => $row['jumlah'],
                'type' => ($row['jenis'] === 'pemasukan_komisi' ? 'income' : 'expense'), // Dynamically set type based on jenis
                'date' => date('d M Y H:i', strtotime($row['created_at'])),
                'username' => $row['username'] ?? 'Unknown',
                'user_role' => $row['user_role'] ?? 'Unknown'
            );
        }
        
        return [
            'status' => 'success',
            'transactions' => $formattedTransactions,
            'totalIncome' => array_sum(array_column($formattedTransactions, 'amount')),
            'totalTransactions' => count($formattedTransactions)
        ];

    } catch (Exception $e) {
        error_log("Error in getAdminTransactions: " . $e->getMessage());
        return ['status' => 'error', 'message' => 'Gagal mengambil transaksi admin: ' . $e->getMessage()];
    }
}

?>