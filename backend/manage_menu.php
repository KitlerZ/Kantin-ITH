<?php
ob_start();
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");
include 'db.php';

$input = file_get_contents("php://input");
$data = json_decode($input, true);

$action = $data['action'] ?? '';

try {
    switch ($action) {
        case 'get_all':
            // Logic to fetch all menu items
            $sql = "SELECT id, nama, harga, kategori, stok, status FROM menu ORDER BY id DESC";
            $result = $conn->query($sql);
            
            $menuItems = [];
            if ($result->num_rows > 0) {
                while($row = $result->fetch_assoc()) {
                    $menuItems[] = $row;
                }
            }
            
            ob_end_clean();
            echo json_encode(["status" => "success", "menu" => $menuItems]);
            break;

        case 'add_menu':
            // Logic to add a new menu item
            $nama = $conn->real_escape_string($data['nama']);
            $harga = (float)$data['harga'];
            $kategori = $conn->real_escape_string($data['kategori'] ?? null);
            $stok = (int)$data['stok'];
            $status = $conn->real_escape_string($data['status']);

            $sql = "INSERT INTO menu (nama, harga, kategori, stok, status) VALUES (?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare statement failed: " . $conn->error);
            }
            $stmt->bind_param("sdsss", $nama, $harga, $kategori, $stok, $status);
            
            if ($stmt->execute()) {
                ob_end_clean();
                echo json_encode(["status" => "success", "message" => "Menu berhasil ditambahkan"]);
            } else {
                throw new Exception("Gagal menambahkan menu: " . $stmt->error);
            }
            $stmt->close();
            break;

        case 'update_menu':
            // Logic to update an existing menu item
            $id = (int)$data['id'];
            $nama = $conn->real_escape_string($data['nama']);
            $harga = (float)$data['harga'];
            $kategori = $conn->real_escape_string($data['kategori'] ?? null);
            $stok = (int)$data['stok'];
            $status = $conn->real_escape_string($data['status']);

            $sql = "UPDATE menu SET nama = ?, harga = ?, kategori = ?, stok = ?, status = ? WHERE id = ?";
            $stmt = $conn->prepare($sql);
             if (!$stmt) {
                throw new Exception("Prepare statement failed: " . $conn->error);
            }
            $stmt->bind_param("sdsssi", $nama, $harga, $kategori, $stok, $status, $id);

            if ($stmt->execute()) {
                 ob_end_clean();
                 echo json_encode(["status" => "success", "message" => "Menu berhasil diperbarui"]);
            } else {
                throw new Exception("Gagal memperbarui menu: " . $stmt->error);
            }
            $stmt->close();
            break;

        case 'delete_menu':
            // Logic to delete a menu item
            $id = (int)$data['id'];

            $sql = "DELETE FROM menu WHERE id = ?";
            $stmt = $conn->prepare($sql);
             if (!$stmt) {
                throw new Exception("Prepare statement failed: " . $conn->error);
            }
            $stmt->bind_param("i", $id);

            if ($stmt->execute()) {
                 ob_end_clean();
                 echo json_encode(["status" => "success", "message" => "Menu berhasil dihapus"]);
            } else {
                throw new Exception("Gagal menghapus menu: " . $stmt->error);
            }
            $stmt->close();
            break;

        default:
            throw new Exception("Aksi tidak valid.");
    }
} catch (Exception $e) {
    error_log("manage_menu.php Error: " . $e->getMessage());
    ob_end_clean();
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}

$conn->close();
?> 