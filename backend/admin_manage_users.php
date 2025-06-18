<?php
ob_start(); // Start output buffering
header('Content-Type: application/json');

include_once 'db.php';

// $conn is already established by db.php

$raw_input = file_get_contents('php://input');
error_log("Admin Manage Users - Raw input: " . $raw_input); // Log raw input
$input = json_decode($raw_input, true);
$action = $input['action'] ?? '';

error_log("Admin Manage Users - Parsed action: " . $action); // Log parsed action
error_log("Admin Manage Users - Full input data: " . print_r($input, true)); // Log full input array

$response = ['status' => 'error', 'message' => 'Aksi tidak valid.'];

try {
    switch ($action) {
        case 'get_all_users':
            $response = getAllUsers($conn);
            break;
        case 'add_user':
            $response = add_user($conn);
            break;
        case 'get_user_details':
            $response = get_user_details($conn);
            break;
        case 'update_user':
            $response = update_user($conn);
            break;
        case 'delete_user':
            $response = delete_user($conn);
            break;
        default:
            // Default error message already set
            break;
    }
} catch (Exception $e) {
    error_log("Exception in admin_manage_users.php: " . $e->getMessage());
    $response = ['status' => 'error', 'message' => 'Terjadi kesalahan internal: ' . $e->getMessage()];
}

ob_end_clean(); // Clear any accidental output before sending JSON
echo json_encode($response);
exit; // Ensure no further output

function getAllUsers($conn) {
    $sql = "SELECT id, username, role, saldo FROM users";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return ['status' => 'success', 'users' => $users];
}

function add_user($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
    $role = $data['role'] ?? '';
    $saldo = $data['saldo'] ?? 0; // Get saldo from input, default to 0

    error_log("add_user function - Received username: " . $username . ", role: " . $role . ", saldo: " . $saldo); // Log values

    if (empty($username) || empty($password) || empty($role)) {
        return ['status' => 'error', 'message' => 'Username, password, dan role harus diisi.'];
    }

    // Check if username already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($existingUser) {
        return ['status' => 'error', 'message' => 'Username sudah ada.'];
    }

    $hashed_password = md5($password);

    $sql = "INSERT INTO users (username, password, role, saldo) VALUES (?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    if ($stmt->execute([$username, $hashed_password, $role, $saldo])) {
        return ['status' => 'success', 'message' => 'Pengguna berhasil ditambahkan.'];
    } else {
        return ['status' => 'error', 'message' => 'Gagal menambahkan pengguna: ' . $stmt->errorInfo()[2]];
    }
}

function get_user_details($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $userId = $data['userId'] ?? 0;

    $sql = "SELECT id, username, role, saldo FROM users WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        return ['status' => 'success', 'user' => $user];
    } else {
        return ['status' => 'error', 'message' => 'Pengguna tidak ditemukan.'];
    }
}

function update_user($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $userId = $data['userId'] ?? 0;
    $username = $data['username'] ?? '';
    $role = $data['role'] ?? '';
    $saldo = $data['saldo'] ?? null;
    $password = $data['password'] ?? null;

    $sql = "UPDATE users SET username = ?, role = ?";
    $params = [$username, $role];

    if ($saldo !== null) {
        $sql .= ", saldo = ?";
        $params[] = $saldo;
    }
    if ($password !== null && !empty($password)) {
        $hashed_password = md5($password);
        $sql .= ", password = ?";
        $params[] = $hashed_password;
    }

    $sql .= " WHERE id = ?";
    $params[] = $userId;

    $stmt = $conn->prepare($sql);
    if ($stmt->execute($params)) {
        return ['status' => 'success', 'message' => 'Pengguna berhasil diperbarui.'];
    } else {
        return ['status' => 'error', 'message' => 'Gagal memperbarui pengguna: ' . $stmt->errorInfo()[2]];
    }
}

function delete_user($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $userId = $data['userId'] ?? 0;

    $sql = "DELETE FROM users WHERE id = ?";
    $stmt = $conn->prepare($sql);
    if ($stmt->execute([$userId])) {
        return ['status' => 'success', 'message' => 'Pengguna berhasil dihapus.'];
    } else {
        return ['status' => 'error', 'message' => 'Gagal menghapus pengguna: ' . $stmt->errorInfo()[2]];
    }
}

$conn->close();

?> 