<?php
header('Content-Type: application/json');
require_once 'db.php';


function getAllUsers($conn) {
    $query = "SELECT id, username, password, role, saldo FROM users";
    $result = mysqli_query($conn, $query);
    
    if (!$result) {
        return ['status' => 'error', 'message' => 'Gagal mengambil data pengguna: ' . mysqli_error($conn)];
    }

    $users = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $users[] = $row;
    }

    return ['status' => 'success', 'users' => $users];
}


function getUserDetails($conn, $userId) {
    $query = "SELECT id, username, password, role, saldo FROM users WHERE id = ?";
    $stmt = mysqli_prepare($conn, $query);
    mysqli_stmt_bind_param($stmt, "i", $userId);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    if (!$result) {
        return ['status' => 'error', 'message' => 'Gagal mengambil detail pengguna: ' . mysqli_error($conn)];
    }

    $user = mysqli_fetch_assoc($result);
    if (!$user) {
        return ['status' => 'error', 'message' => 'Pengguna tidak ditemukan'];
    }

    return ['status' => 'success', 'user' => $user];
}


function updateUser($conn, $userId, $username, $role, $password = null, $saldo = null) {
    $query = "UPDATE users SET username = ?, role = ?";
    $params = [$username, $role];
    $types = "ss";

    if ($password !== null) {
        $query .= ", password = ?";
        $params[] = $password;
        $types .= "s";
    }

    if ($saldo !== null) {
        $query .= ", saldo = ?";
        $params[] = $saldo;
        $types .= "d";
    }

    $query .= " WHERE id = ?";
    $params[] = $userId;
    $types .= "i";

    $stmt = mysqli_prepare($conn, $query);
    mysqli_stmt_bind_param($stmt, $types, ...$params);
    
    if (!mysqli_stmt_execute($stmt)) {
        return ['status' => 'error', 'message' => 'Gagal memperbarui pengguna: ' . mysqli_error($conn)];
    }

    return ['status' => 'success', 'message' => 'Pengguna berhasil diperbarui'];
}


function deleteUser($conn, $userId) {
    $query = "DELETE FROM users WHERE id = ?";
    $stmt = mysqli_prepare($conn, $query);
    mysqli_stmt_bind_param($stmt, "i", $userId);
    
    if (!mysqli_stmt_execute($stmt)) {
        return ['status' => 'error', 'message' => 'Gagal menghapus pengguna: ' . mysqli_error($conn)];
    }

    return ['status' => 'success', 'message' => 'Pengguna berhasil dihapus'];
}


function addUser($conn, $username, $password, $role, $saldo = 0) {
    $query = "INSERT INTO users (username, password, role, saldo) VALUES (?, ?, ?, ?)";
    $stmt = mysqli_prepare($conn, $query);
    mysqli_stmt_bind_param($stmt, "sssd", $username, $password, $role, $saldo);
    
    if (!mysqli_stmt_execute($stmt)) {
        return ['status' => 'error', 'message' => 'Gagal menambah pengguna: ' . mysqli_error($conn)];
    }

    return ['status' => 'success', 'message' => 'Pengguna berhasil ditambahkan'];
}


$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? '';

try {
    switch ($action) {
        case 'get_all_users':
            echo json_encode(getAllUsers($conn));
            break;
        
        case 'get_user_details':
            $userId = $data['user_id'] ?? 0;
            echo json_encode(getUserDetails($conn, $userId));
            break;
        
        case 'update_user':
            $userId = $data['user_id'] ?? 0;
            $username = $data['username'] ?? '';
            $role = $data['role'] ?? '';
            $password = $data['password'] ?? null;
            $saldo = $data['saldo'] ?? null;
            echo json_encode(updateUser($conn, $userId, $username, $role, $password, $saldo));
            break;
        
        case 'delete_user':
            $userId = $data['user_id'] ?? 0;
            echo json_encode(deleteUser($conn, $userId));
            break;
        
        case 'add_user':

            if (empty($data['username']) || empty($data['password']) || empty($data['role'])) {
                throw new Exception('Username, password, dan role harus diisi');
            }


            $stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
            $stmt->bind_param("s", $data['username']);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                throw new Exception('Username sudah digunakan');
            }

            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
            

            $saldo = ($data['role'] === 'admin') ? 0 : ($data['saldo'] ?? 0);



            $stmt = $conn->prepare("INSERT INTO users (username, password, role, saldo) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("sssd", $data['username'], $hashedPassword, $data['role'], $saldo);
            
            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Pengguna berhasil ditambahkan']);
            } else {
                throw new Exception('Gagal menambahkan pengguna');
            }
            break;
        
        default:
            throw new Exception('Aksi tidak valid');
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

mysqli_close($conn);
?> 
