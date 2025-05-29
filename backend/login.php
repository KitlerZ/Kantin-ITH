<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");
include 'db.php';

// AMANKAN INPUT
$input = file_get_contents("php://input");
if (!$input) {
  error_log("login.php: No input data received.");
  echo json_encode(["status" => "error", "message" => "Tidak ada data yang dikirim"]);
  exit;
}

$data = json_decode($input, true);

// Pastikan $data adalah array dan 'action' ada
if (!is_array($data) || !isset($data['action'])) {
  error_log("login.php: Invalid data format or action not set. Received: " . $input);
  echo json_encode(["status" => "error", "message" => "Format data tidak valid atau aksi tidak ditentukan"]);
  exit;
}

$action = $data['action'] ?? '';
error_log("login.php: Received action: " . $action);

// Gunakan blok try-catch global untuk menangani error yang mungkin terjadi sebelum atau di luar action handling
try {

// === LOGIN ===
if ($action === 'login') {
  error_log("login.php: Processing login action.");

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
    error_log("login.php: Login success for user: " . $username . ", ID: " . $user['id']);
    echo json_encode(["status" => "success", "role" => $user['role'], "userId" => $user['id'], "username" => $username]);
  } else {
    error_log("login.php: Login failed for username: " . $username);
    echo json_encode(["status" => "error", "message" => "Username atau password salah"]);
  }
    $stmt->close();

// === RESET PASSWORD ===
} elseif ($action === 'reset') {
  error_log("login.php: Processing reset action.");

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
    error_log("login.php: Password reset success for username: " . $username);
    echo json_encode(["status" => "success", "message" => "Password berhasil direset"]);
  } else {
    error_log("login.php: Password reset failed or username not found: " . $username);
      echo json_encode(["status" => "error", "message" => "Username tidak ditemukan atau password tidak berubah"]);
  }
    $stmt->close();

// === GET SALDO ===
} elseif ($action === 'get_saldo') {
  error_log("login.php: Processing get_saldo action.");

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
      // User not found
      echo json_encode(['status' => 'error', 'message' => 'User tidak ditemukan']);
  }
    $stmt->close();

// === GET MENU ===
} elseif ($action === 'get_menu') {
  error_log("login.php: Processing get_menu action.");
  $menu = [];
    // Tambahkan ORDER BY untuk memastikan urutan konsisten
    $sql = "SELECT id, nama, harga, kategori FROM menu WHERE status='Ready' ORDER BY id";
  error_log("login.php: Executing menu query: " . $sql);
  $res = $conn->query($sql);

  if ($res) {
    error_log("login.php: Menu query executed successfully.");
    if ($res->num_rows > 0) {
      while ($row = $res->fetch_assoc()) {
        $menu[] = [
          'id' => (int)$row['id'],
          'nama' => $row['nama'],
          'harga' => (float)$row['harga'],
          'kategori' => $row['kategori']
        ];
      }
      error_log("login.php: Found " . count($menu) . " menu items with status='Ready'.");
    } else {
      error_log("login.php: Menu query returned 0 rows.");
    }
    echo json_encode($menu);
  } else {
      // Database query failed
    error_log("login.php: Menu query failed: " . $conn->error);
      throw new Exception("Gagal mengambil data menu dari database: " . $conn->error);
  }

// === CHECKOUT ===
} elseif ($action === 'checkout') {
  error_log("login.php: Processing checkout action.");

    // Validasi input checkout
    if (!isset($data['userId']) || !isset($data['items']) || !is_array($data['items']) || !isset($data['totalAmount'])) {
        throw new Exception("Data checkout tidak lengkap atau format salah.");
    }

    $userId = $conn->real_escape_string($data['userId']); // Gunakan userId
    $items = $data['items'];
    $totalAmount = floatval($data['totalAmount']); // Pastikan totalAmount adalah float

    // Hitung ulang total di backend untuk keamanan
    $calculatedTotal = 0;
    $itemDetails = []; // Array untuk menyimpan detail item menu dari DB

    if (count($items) === 0) {
         throw new Exception("Keranjang kosong, tidak ada item untuk diproses.");
    }

    // Ambil detail menu dan hitung total yang dihitung server
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

    // Periksa apakah total yang dihitung server sesuai dengan total dari frontend (beri toleransi kecil untuk float)
    if (abs($calculatedTotal - $totalAmount) > 0.01) {
        error_log("login.php: Checkout total mismatch. Frontend total: " . $totalAmount . ", Calculated total: " . $calculatedTotal);
        // throw new Exception("Terjadi ketidaksesuaian total pembayaran. Silakan refresh dan coba lagi.");
        // Untuk saat ini, kita mungkin mengizinkan jika totalAmount dari frontend lebih besar atau sama dengan calculatedTotal
        if ($totalAmount < $calculatedTotal) {
             throw new Exception("Total pembayaran tidak sesuai. Silakan refresh dan coba lagi.");
        }
    }

    // Ambil saldo user dari DB
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

    error_log("login.php: User ID: " . $userId . ", Current Saldo: " . $saldo . ", Calculated Total: " . $calculatedTotal);

    // Periksa saldo
    if ($saldo < $calculatedTotal) {
      error_log("login.php: Checkout failed, insufficient saldo for user ID: " . $userId);
      echo json_encode(["status" => "error", "message" => "Saldo tidak cukup"]);
      // Tidak perlu exit di sini, biarkan script selesai dan koneksi ditutup

    } else {

      // Mulai transaksi
      $conn->begin_transaction();
      error_log("login.php: Starting transaction for user ID: " . $userId);

      try {
        // Update saldo
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

        // Masukkan order
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
        error_log("login.php: Order created with ID: " . $orderId);

        // Masukkan item order dan update stok
        $sqlInsertOrderItem = "INSERT INTO order_items (order_id, menu_id, jumlah, subtotal) VALUES (?, ?, ?, ?)";
        $sqlStokUpdate = "UPDATE menu SET stok = stok - ? WHERE id=?";

        $stmtInsertOrderItem = $conn->prepare($sqlInsertOrderItem);
        $stmtStokUpdate = $conn->prepare($sqlStokUpdate);

        if (!$stmtInsertOrderItem || !$stmtStokUpdate) {
            // Ini bisa jadi error prepare statement, rollback dan laporkan
             if ($stmtInsertOrderItem) $stmtInsertOrderItem->close();
             if ($stmtStokUpdate) $stmtStokUpdate->close();
             throw new Exception("Prepare statement untuk item order/stok gagal: " . $conn->error);
        }

        foreach ($itemDetails as $item) {
            $subtotalItem = $item['harga_per_item'] * $item['jumlah'];

            // Insert item order
            $stmtInsertOrderItem->bind_param("iiid", $orderId, $item['id'], $item['jumlah'], $subtotalItem);
            if (!$stmtInsertOrderItem->execute()) {
                 // Jangan langsung rollback, log dulu dan throw exception
                 error_log("login.php: Insert order item failed for order ID " . $orderId . ", item ID " . $item['id'] . ": " . $stmtInsertOrderItem->error);
                 throw new Exception("Gagal memasukkan item pesanan: " . $stmtInsertOrderItem->error);
            }

            // Update stok
            $stmtStokUpdate->bind_param("ii", $item['jumlah'], $item['id']);
            if (!$stmtStokUpdate->execute()) {
                 // Jangan langsung rollback, log dulu dan throw exception
                 error_log("login.php: Stock update failed for menu ID " . $item['id'] . ": " . $stmtStokUpdate->error);
                 throw new Exception("Gagal memperbarui stok menu: " . $stmtStokUpdate->error);
            }
        }

        // Tutup prepared statements loop
        $stmtInsertOrderItem->close();
        $stmtStokUpdate->close();

        // Commit transaksi jika semua berhasil
    $conn->commit();
        error_log("login.php: Transaction committed successfully for user ID: " . $userId);
        echo json_encode(["status" => "success", "message" => "Pesanan berhasil diproses!"]);

  } catch (Exception $e) {
        // Rollback transaksi jika terjadi error
    $conn->rollback();
        error_log("login.php: Transaction rolled back for user ID: " . $userId . ". Error: " . $e->getMessage());
        // Echo error JSON
    echo json_encode(["status" => "error", "message" => "Gagal proses pesanan: " . $e->getMessage()]);
      }
  }

// === DEFAULT ===
} else {
  error_log("login.php: Unrecognized action received: " . $action);
  echo json_encode(["status" => "error", "message" => "Aksi tidak dikenali"]);
}

} catch (Exception $e) {
    // Tangani exception global (misalnya error koneksi DB, error prepare statement di luar try checkout, dll)
    error_log("login.php: Global error caught. Error: " . $e->getMessage());
    // Jika ada transaksi aktif yang belum di-commit/rollback, lakukan rollback
    if ($conn && $conn->current_transaction_id() !== false) {
         $conn->rollback();
         error_log("login.php: Global error caused rollback.");
    }
     // Pastikan output selalu JSON
    echo json_encode(["status" => "error", "message" => "Terjadi kesalahan server: " . $e->getMessage()]);
}

// Pastikan koneksi ditutup di akhir
if ($conn) {
$conn->close();
}
error_log("login.php: Script finished.");
?>
