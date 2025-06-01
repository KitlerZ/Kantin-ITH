<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");
include 'db.php';

$input = file_get_contents("php://input");
if (!$input) {
    echo json_encode(["status" => "error", "message" => "Tidak ada data yang dikirim"]);
    exit;
}

$data = json_decode($input, true);

if (!is_array($data) || !isset($data['action'])) {
    echo json_encode(["status" => "error", "message" => "Format data tidak valid atau aksi tidak ditentukan"]);
    exit;
}

$action = $data['action'] ?? '';

try {

if ($action === 'login') {

    if (!isset($data['username']) || !isset($data['password'])) {
        throw new Exception("Username atau password tidak lengkap.");
    }

    $username = $conn->real_escape_string($data['username']);
    $password = $conn->real_escape_string($data['password']);

    $sql = "SELECT id, role FROM users WHERE username=? AND password=?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }
    $stmt->bind_param("ss", $username, $password);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result && $result->num_rows === 1) {
        $user = $result->fetch_assoc();
        echo json_encode(["status" => "success", "role" => $user['role'], "userId" => $user['id'], "username" => $username]);
    } else {
        echo json_encode(["status" => "error", "message" => "Username atau password salah"]);
    }
    $stmt->close();

} elseif ($action === 'reset') {

    if (!isset($data['username']) || !isset($data['new_password'])) {
            throw new Exception("Username atau password baru tidak lengkap.");
    }

    $username = $conn->real_escape_string($data['username']);
    $new_password = $conn->real_escape_string($data['new_password']);

    $sql = "UPDATE users SET password=? WHERE username=?";
    $stmt = $conn->prepare($sql);
      if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }
    $stmt->bind_param("ss", $new_password, $username);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
    echo json_encode(["status" => "success", "message" => "Password berhasil direset"]);
    } else {
          echo json_encode(["status" => "error", "message" => "Username tidak ditemukan atau password tidak berubah"]);
    }
    $stmt->close();

} elseif ($action === 'get_saldo') {

    if (!isset($data['userId'])) {
      throw new Exception('User ID tidak ditemukan dalam permintaan.');
    }

    $userId = $conn->real_escape_string($data['userId']);
    $sql = "SELECT saldo FROM users WHERE id = ?";
    $stmt = $conn->prepare($sql);
      if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result && $result->num_rows > 0) {
      $user = $result->fetch_assoc();
      echo json_encode(['saldo' => floatval($user['saldo'])]);
    } else {
      echo json_encode(['status' => 'error', 'message' => 'User tidak ditemukan']);
    }
    $stmt->close();

} elseif ($action === 'get_menu') {
    $menu = [];
    $sql = "SELECT id, nama, harga, kategori FROM menu WHERE status='Ready' ORDER BY id";
    $res = $conn->query($sql);

    if ($res) {
        if ($res->num_rows > 0) {
            while ($row = $res->fetch_assoc()) {
                $menu[] = [
                    'id' => (int)$row['id'],
                    'nama' => $row['nama'],
                    'harga' => (float)$row['harga'],
                    'kategori' => $row['kategori']
                ];
            }
        } else {
        }
        echo json_encode($menu);
    } else {
          throw new Exception("Gagal mengambil data menu dari database: " . $conn->error);
    }

} elseif ($action === 'checkout') {

    if (!isset($data['userId']) || !isset($data['items']) || !is_array($data['items']) || !isset($data['totalAmount'])) {
        throw new Exception("Data checkout tidak lengkap atau format salah.");
    }

    $userId = $conn->real_escape_string($data['userId']);
    $items = $data['items'];
    $totalAmount = floatval($data['totalAmount']);

    $calculatedTotal = 0;
    $itemDetails = [];

    if (count($items) === 0) {
            throw new Exception("Keranjang kosong, tidak ada item untuk diproses.");
    }

    foreach ($items as $item) {
        if (!isset($item['id']) || !isset($item['jumlah']) || !is_numeric($item['id']) || !is_numeric($item['jumlah'])) {
                throw new Exception("Format item keranjang tidak valid.");
        }
        $itemId = $conn->real_escape_string($item['id']);
        $itemJumlah = intval($item['jumlah']);

        if ($itemJumlah <= 0) {
                throw new Exception("Jumlah item harus lebih dari 0.");
        }

        $sqlItem = "SELECT harga, stok FROM menu WHERE id = ?";
        $stmtItem = $conn->prepare($sqlItem);
        if (!$stmtItem) {
            throw new Exception("Prepare statement untuk item menu gagal: " . $conn->error);
        }
        $stmtItem->bind_param("i", $itemId);
        $stmtItem->execute();
        $resultItem = $stmtItem->get_result();

        if ($resultItem->num_rows === 0) {
            $stmtItem->close();
            throw new Exception("Menu dengan ID {$itemId} tidak ditemukan.");
        }

        $menuDetail = $resultItem->fetch_assoc();
        $stmtItem->close();

        if ($menuDetail['stok'] < $itemJumlah) {
                throw new Exception("Stok untuk menu {$itemId} tidak cukup.");
        }

        $calculatedTotal += floatval($menuDetail['harga']) * $itemJumlah;
        $itemDetails[] = [
            'id' => intval($itemId),
            'jumlah' => $itemJumlah,
            'harga_per_item' => floatval($menuDetail['harga'])
        ];
    }

    if (abs($calculatedTotal - $totalAmount) > 0.01) {
        if ($totalAmount < $calculatedTotal) {
                throw new Exception("Total pembayaran tidak sesuai. Silakan refresh dan coba lagi.");
        }
    }

    $sqlUser = "SELECT saldo FROM users WHERE id = ?";
    $stmtUser = $conn->prepare($sqlUser);
    if (!$stmtUser) {
        throw new Exception("Prepare statement untuk user gagal: " . $conn->error);
    }
    $stmtUser->bind_param("i", $userId);
    $stmtUser->execute();
    $resultUser = $stmtUser->get_result();

    if ($resultUser->num_rows === 0) {
        $stmtUser->close();
        throw new Exception("User tidak ditemukan saat proses checkout.");
    }
    $user = $resultUser->fetch_assoc();
    $stmtUser->close();
    $saldo = floatval($user['saldo']);

    if ($saldo < $calculatedTotal) {
      echo json_encode(["status" => "error", "message" => "Saldo tidak cukup"]);

    } else {

      $conn->begin_transaction();

      try {
        $sqlSaldoUpdate = "UPDATE users SET saldo = saldo - ? WHERE id=?";
        $stmtSaldoUpdate = $conn->prepare($sqlSaldoUpdate);
        if (!$stmtSaldoUpdate) {
            throw new Exception("Prepare statement update saldo gagal: " . $conn->error);
        }
        $stmtSaldoUpdate->bind_param("di", $calculatedTotal, $userId);
        if (!$stmtSaldoUpdate->execute()) {
            throw new Exception("Eksekusi update saldo gagal: " . $stmtSaldoUpdate->error);
        }
        $stmtSaldoUpdate->close();

        $sqlInsertOrder = "INSERT INTO orders (pembeli_id, total_harga) VALUES (?, ?)";
        $stmtInsertOrder = $conn->prepare($sqlInsertOrder);
        if (!$stmtInsertOrder) {
                throw new Exception("Prepare statement insert order gagal: " . $conn->error);
        }
        $stmtInsertOrder->bind_param("id", $userId, $calculatedTotal);
            if (!$stmtInsertOrder->execute()) {
                throw new Exception("Eksekusi insert order gagal: " . $stmtInsertOrder->error);
        }
        $orderId = $conn->insert_id;
        $stmtInsertOrder->close();

        $sqlInsertOrderItem = "INSERT INTO order_items (order_id, menu_id, jumlah, subtotal) VALUES (?, ?, ?, ?)";
        $sqlStokUpdate = "UPDATE menu SET stok = stok - ? WHERE id=?";

        $stmtInsertOrderItem = $conn->prepare($sqlInsertOrderItem);
        $stmtStokUpdate = $conn->prepare($sqlStokUpdate);

        if (!$stmtInsertOrderItem || !$stmtStokUpdate) {
                if ($stmtInsertOrderItem) $stmtInsertOrderItem->close();
                if ($stmtStokUpdate) $stmtStokUpdate->close();
                throw new Exception("Prepare statement untuk item order/stok gagal: " . $conn->error);
        }

        foreach ($itemDetails as $item) {
            $subtotalItem = $item['harga_per_item'] * $item['jumlah'];

            $stmtInsertOrderItem->bind_param("iiid", $orderId, $item['id'], $item['jumlah'], $subtotalItem);
            if (!$stmtInsertOrderItem->execute()) {
                throw new Exception("Gagal memasukkan item pesanan: " . $stmtInsertOrderItem->error);
            }

            $stmtStokUpdate->bind_param("ii", $item['jumlah'], $item['id']);
            if (!$stmtStokUpdate->execute()) {
                throw new Exception("Gagal memperbarui stok menu: " . $stmtStokUpdate->error);
            }
        }

        $stmtInsertOrderItem->close();
        $stmtStokUpdate->close();

        $conn->commit();
        echo json_encode(["status" => "success", "message" => "Pesanan berhasil diproses!"]);

    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(["status" => "error", "message" => "Gagal proses pesanan: " . $e->getMessage()]);
      }
    }

} else {
    echo json_encode(["status" => "error", "message" => "Aksi tidak dikenali"]);
}

} catch (Exception $e) {
    if ($conn && $conn->current_transaction_id() !== false) {
            $conn->rollback();
    }
    echo json_encode(["status" => "error", "message" => "Terjadi kesalahan server: " . $e->getMessage()]);
}

if ($conn) {
    $conn->close();
}
?>
