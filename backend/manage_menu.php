<?php
ob_start();
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Debugging: Log POST and FILES data
file_put_contents('php_debug_manage_menu.log', "\n---" . date('Y-m-d H:i:s') . "---\n", FILE_APPEND);
file_put_contents('php_debug_manage_menu.log', "_POST: " . print_r($_POST, true) . "\n", FILE_APPEND);
file_put_contents('php_debug_manage_menu.log', "_FILES: " . print_r($_FILES, true) . "\n", FILE_APPEND);

// header("Content-Type: application/json"); // Commented out to allow FormData to be parsed correctly
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include 'db.php';

if (!isset($conn) || !$conn) {
    ob_clean();
    echo json_encode(['status' => 'error', 'message' => 'Koneksi database gagal.']);
    exit;
}

$action = $_POST['action'] ?? '';

try {
    $uploadDir = '../aset/menu_images/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    switch ($action) {
        case 'get_all':
            $userId = $_POST['userId'] ?? null;
            $sql = "SELECT id, nama, harga, kategori, stok, status, gambar FROM menu WHERE penjual_id = ? ORDER BY id DESC";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$userId]);
            
            $menuItems = [];
            if ($stmt) {
                $menuItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            
            ob_end_clean();
            echo json_encode(["status" => "success", "menu" => $menuItems]);
            break;

        case 'add_menu':
            $nama = $_POST['nama'];
            $harga = (float)$_POST['harga'];
            $kategori = $_POST['kategori'] ?? null;
            $stok = (int)$_POST['stok'];
            $status = $_POST['status'];
            $userId = $_POST['userId'];
            $gambarFileName = null;

            if (isset($_FILES['gambar']) && $_FILES['gambar']['error'] === UPLOAD_ERR_OK) {
                $fileTmpPath = $_FILES['gambar']['tmp_name'];
                $fileName = $_FILES['gambar']['name'];
                $fileSize = $_FILES['gambar']['size'];
                $fileType = $_FILES['gambar']['type'];
                $fileNameCmps = explode(".", $fileName);
                $fileExtension = strtolower(end($fileNameCmps));

                $newFileName = md5(time() . $fileName) . '.' . $fileExtension;
                $destPath = $uploadDir . $newFileName;

                $allowedfileExtensions = array('jpg', 'gif', 'png', 'jpeg');
                if (in_array($fileExtension, $allowedfileExtensions) && $fileSize < 5000000) {
                    if (move_uploaded_file($fileTmpPath, $destPath)) {
                        $gambarFileName = $newFileName;
                    } else {
                        throw new Exception("Gagal mengunggah gambar.");
                    }
                } else {
                    throw new Exception("Format gambar tidak valid atau ukuran file terlalu besar (maks 5MB).");
                }
            }

            $sql = "INSERT INTO menu (nama, harga, kategori, stok, status, penjual_id, gambar) VALUES (?, ?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare statement failed: " . $conn->errorInfo()[2]);
            }
            
            if ($stmt->execute([$nama, $harga, $kategori, $stok, $status, $userId, $gambarFileName])) {
                ob_end_clean();
                echo json_encode(["status" => "success", "message" => "Menu berhasil ditambahkan"]);
            } else {
                throw new Exception("Gagal menambahkan menu: " . $stmt->errorInfo()[2]);
            }
            break;

        case 'update_menu':
            $id = (int)$_POST['id'];
            $nama = $_POST['nama'];
            $harga = (float)$_POST['harga'];
            $kategori = $_POST['kategori'] ?? null;
            $stok = (int)$_POST['stok'];
            $status = $_POST['status'];
            $gambarFileName = null;

            $stmt = $conn->prepare("SELECT gambar FROM menu WHERE id = ?");
            $stmt->execute([$id]);
            $currentGambar = $stmt->fetchColumn();

            if (isset($_FILES['gambar']) && $_FILES['gambar']['error'] === UPLOAD_ERR_OK) {
                $fileTmpPath = $_FILES['gambar']['tmp_name'];
                $fileName = $_FILES['gambar']['name'];
                $fileSize = $_FILES['gambar']['size'];
                $fileType = $_FILES['gambar']['type'];
                $fileNameCmps = explode(".", $fileName);
                $fileExtension = strtolower(end($fileNameCmps));

                $newFileName = md5(time() . $fileName) . '.' . $fileExtension;
                $destPath = $uploadDir . $newFileName;

                $allowedfileExtensions = array('jpg', 'gif', 'png', 'jpeg');
                if (in_array($fileExtension, $allowedfileExtensions) && $fileSize < 5000000) {
                    if (move_uploaded_file($fileTmpPath, $destPath)) {
                        $gambarFileName = $newFileName;
                        if ($currentGambar && file_exists($uploadDir . $currentGambar) && $currentGambar !== 'default-menu.png') {
                             unlink($uploadDir . $currentGambar);
                        }
                    } else {
                        throw new Exception("Gagal mengunggah gambar baru.");
                    }
                } else {
                    throw new Exception("Format gambar baru tidak valid atau ukuran file terlalu besar (maks 5MB).");
                }
            } else {
                $gambarFileName = $currentGambar;
            }

            $sql = "UPDATE menu SET nama = ?, harga = ?, kategori = ?, stok = ?, status = ?, gambar = ? WHERE id = ?";
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare statement failed: " . $conn->errorInfo()[2]);
            }

            if ($stmt->execute([$nama, $harga, $kategori, $stok, $status, $gambarFileName, $id])) {
                 ob_end_clean();
                 echo json_encode(["status" => "success", "message" => "Menu berhasil diperbarui"]);
            } else {
                throw new Exception("Gagal memperbarui menu: " . $stmt->errorInfo()[2]);
            }
            break;

        case 'delete_menu':
            $id = (int)$_POST['id'];

            $stmt = $conn->prepare("SELECT gambar FROM menu WHERE id = ?");
            $stmt->execute([$id]);
            $gambarToDelete = $stmt->fetchColumn();

            $sql = "DELETE FROM menu WHERE id = ?";
            $stmt = $conn->prepare($sql);
             if (!$stmt) {
                throw new Exception("Prepare statement failed: " . $conn->errorInfo()[2]);
            }

            if ($stmt->execute([$id])) {
                if ($gambarToDelete && file_exists($uploadDir . $gambarToDelete) && $gambarToDelete !== 'default-menu.png') {
                     unlink($uploadDir . $gambarToDelete);
                }
                ob_end_clean();
                echo json_encode(["status" => "success", "message" => "Menu berhasil dihapus"]);
            } else {
                throw new Exception("Gagal menghapus menu: " . $stmt->errorInfo()[2]);
            }
            break;

        default:
            throw new Exception("Aksi tidak valid.");
    }
} catch (Exception $e) {
    error_log("manage_menu.php Error: " . $e->getMessage());
    ob_end_clean();
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}