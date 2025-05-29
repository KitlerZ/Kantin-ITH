<?php
ob_start(); // Start output buffering
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");
include 'db.php';

// AMANKAN INPUT
$input = file_get_contents("php://input");
error_log("seller_dashboard.php: Received input: " . $input);

if (!$input) {
  error_log("seller_dashboard.php: No input data received.");
  ob_end_clean(); // Clean buffer before JSON output
  echo json_encode(["status" => "error", "message" => "Tidak ada data yang dikirim"]);
  exit;
}

$data = json_decode($input, true);
error_log("seller_dashboard.php: Decoded data: " . print_r($data, true));

// Pastikan $data adalah array dan 'action' ada
if (!is_array($data) || !isset($data['action'])) {
  error_log("seller_dashboard.php: Invalid data format or action not set. Received: " . $input);
  ob_end_clean(); // Clean buffer before JSON output
  echo json_encode(["status" => "error", "message" => "Format data tidak valid atau aksi tidak ditentukan"]);
  exit;
}

$action = $data['action'] ?? '';
error_log("seller_dashboard.php: Processing action: " . $action);

try {
  // === GET STATS ===
  if ($action === 'get_stats') {
    error_log("seller_dashboard.php: Processing get_stats action.");

    // Get today's date in Y-m-d format
    $today = date('Y-m-d');
    error_log("seller_dashboard.php: Today's date: " . $today);

    // Get today's orders count and total income
    $sql = "SELECT COUNT(*) as order_count, SUM(total_harga) as total_income 
            FROM orders 
            WHERE DATE(created_at) = ?";
    error_log("seller_dashboard.php: SQL for orders: " . $sql);
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
      throw new Exception("Prepare statement for order stats failed: " . $conn->error);
    }
    $stmt->bind_param("s", $today);
    $stmt->execute();
    $result = $stmt->get_result();
    $stats = $result->fetch_assoc();
    error_log("seller_dashboard.php: Order stats result: " . print_r($stats, true));
    $stmt->close();

    // Get count of active menu items
    $sql = "SELECT COUNT(*) as menu_count FROM menu WHERE status = 'Ready'";
    error_log("seller_dashboard.php: SQL for menu count: " . $sql);
    
    $result = $conn->query($sql);
    if (!$result) {
      throw new Exception("Query for active menu count failed: " . $conn->error);
    }
    $menuStats = $result->fetch_assoc();
    error_log("seller_dashboard.php: Menu stats result: " . print_r($menuStats, true));

    // Get count of completed transactions today
    $sql = "SELECT COUNT(*) as completed_count 
            FROM orders 
            WHERE DATE(created_at) = ? AND status = 'Selesai'";
    error_log("seller_dashboard.php: SQL for completed transactions: " . $sql);
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
      throw new Exception("Prepare statement for completed transactions failed: " . $conn->error);
    }
    $stmt->bind_param("s", $today);
    $stmt->execute();
    $result = $stmt->get_result();
    $completedStats = $result->fetch_assoc();
    error_log("seller_dashboard.php: Completed stats result: " . print_r($completedStats, true));
    $stmt->close();

    $response = [
      "status" => "success",
      "today_orders" => intval($stats['order_count'] ?? 0),
      "today_income" => floatval($stats['total_income'] ?? 0),
      "active_menu" => intval($menuStats['menu_count'] ?? 0),
      "confirmed_transactions" => intval($completedStats['completed_count'] ?? 0)
    ];
    error_log("seller_dashboard.php: Sending response: " . print_r($response, true));
    
    ob_end_clean(); // Clean buffer before JSON output
    echo json_encode($response);

  // === GET RECENT ORDERS ===
  } elseif ($action === 'get_recent_orders') {
    error_log("seller_dashboard.php: Processing get_recent_orders action.");

    // Get recent orders with their items
    $sql = "SELECT o.id, o.created_at, o.total_harga, o.status,
                   oi.menu_id, oi.jumlah, oi.subtotal,
                   m.nama as menu_nama
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN menu m ON oi.menu_id = m.id
            ORDER BY o.created_at DESC";
    
    $result = $conn->query($sql);
    if (!$result) {
      throw new Exception("Query for recent orders failed: " . $conn->error);
    }

    $orders = [];
    $currentOrder = null;

    while ($row = $result->fetch_assoc()) {
      if (!$currentOrder || $currentOrder['id'] !== $row['id']) {
        if ($currentOrder) {
          $orders[] = $currentOrder;
        }
        $currentOrder = [
          'id' => $row['id'],
          'time' => date('d/m/Y H:i', strtotime($row['created_at'])),
          'total' => floatval($row['total_harga']),
          'status' => $row['status'],
          'items' => []
        ];
      }
      $currentOrder['items'][] = [
        'nama' => $row['menu_nama'],
        'jumlah' => intval($row['jumlah']),
        'harga_per_item' => floatval($row['subtotal'] / $row['jumlah'])
      ];
    }
    // Add the last order
    if ($currentOrder) {
      $orders[] = $currentOrder;
    }

    ob_end_clean(); // Clean buffer before JSON output
    echo json_encode([
      "status" => "success",
      "orders" => $orders
    ]);

  // === GET SUMMARY ===
  } elseif ($action === 'get_summary') {
      error_log("seller_dashboard.php: Processing get_summary action.");

      // Get list of pending orders (status 'Diproses') with items
      $sqlPendingOrders = "SELECT o.id, o.created_at, o.total_harga, o.status,
                                 oi.menu_id, oi.jumlah, oi.subtotal,
                                 m.nama as menu_nama
                          FROM orders o
                          JOIN order_items oi ON o.id = oi.order_id
                          JOIN menu m ON oi.menu_id = m.id
                          WHERE o.status = 'Diproses'
                          ORDER BY o.created_at ASC";
      $resultPendingOrders = $conn->query($sqlPendingOrders);
      if (!$resultPendingOrders) {
         throw new Exception("Query for pending orders failed: " . $conn->error);
      }

      $pendingOrders = [];
      $currentOrder = null;

      while ($row = $resultPendingOrders->fetch_assoc()) {
        if (!$currentOrder || $currentOrder['id'] !== $row['id']) {
          if ($currentOrder) {
            $pendingOrders[] = $currentOrder;
          }
          $currentOrder = [
            'id' => $row['id'],
            'time' => date('d/m/Y H:i', strtotime($row['created_at'])),
            'total' => floatval($row['total_harga']),
            'status' => $row['status'],
            'items' => [],
          ];
        }
        $currentOrder['items'][] = [
          'nama' => $row['menu_nama'],
          'jumlah' => intval($row['jumlah']),
          'harga_per_item' => floatval($row['subtotal'] / $row['jumlah'])
        ];
      }
      if ($currentOrder) {
        $pendingOrders[] = $currentOrder;
      }

      // Get list of orders with status 'Menunggu' with items
      $sqlPendingPayments = "SELECT o.id, o.created_at, o.total_harga, o.status,
                                  oi.menu_id, oi.jumlah, oi.subtotal,
                                  m.nama as menu_nama
                           FROM orders o
                           JOIN order_items oi ON o.id = oi.order_id
                           JOIN menu m ON oi.menu_id = m.id
                           WHERE o.status = 'Menunggu'
                           ORDER BY o.created_at ASC";
      $resultPendingPayments = $conn->query($sqlPendingPayments);
      if (!$resultPendingPayments) {
          throw new Exception("Query for pending payments failed: " . $conn->error);
      }

      $pendingPayments = [];
      $currentOrder = null;

      while ($row = $resultPendingPayments->fetch_assoc()) {
        if (!$currentOrder || $currentOrder['id'] !== $row['id']) {
          if ($currentOrder) {
            $pendingPayments[] = $currentOrder;
          }
          $currentOrder = [
            'id' => $row['id'],
            'time' => date('d/m/Y H:i', strtotime($row['created_at'])),
            'total' => floatval($row['total_harga']),
            'status' => $row['status'],
            'items' => [],
          ];
        }
        $currentOrder['items'][] = [
          'nama' => $row['menu_nama'],
          'jumlah' => intval($row['jumlah']),
          'harga_per_item' => floatval($row['subtotal'] / $row['jumlah'])
        ];
      }
      if ($currentOrder) {
        $pendingPayments[] = $currentOrder;
      }

      // Get list of menu items with low stock (stok < 3) and status 'Ready'
      $sqlLowStock = "SELECT id, nama, stok FROM menu WHERE stok < 3 AND status = 'Ready' ORDER BY stok ASC";
      $resultLowStock = $conn->query($sqlLowStock);
       if (!$resultLowStock) {
         throw new Exception("Query for low stock menu failed: " . $conn->error);
      }

      $lowStockItems = [];
      while ($row = $resultLowStock->fetch_assoc()) {
          $lowStockItems[] = [
              'id' => (int)$row['id'],
              'nama' => $row['nama'],
              'stok' => (int)$row['stok']
          ];
      }

      ob_end_clean(); // Clean buffer before JSON output
      echo json_encode([
          "status" => "success",
          "pending_orders" => $pendingOrders,
          "pending_payments" => $pendingPayments,
          "low_stock_items" => $lowStockItems
      ]);

  // === UPDATE ORDER STATUS ===
  } elseif ($action === 'update_order_status') {
    error_log("seller_dashboard.php: Processing update_order_status action.");

    if (!isset($data['order_id']) || !isset($data['status'])) {
      throw new Exception("Order ID atau status tidak lengkap.");
    }

    $orderId = $conn->real_escape_string($data['order_id']);
    $status = $conn->real_escape_string($data['status']);

    // Define valid statuses
    $validStatuses = ['Menunggu', 'Diproses', 'Siap Diambil', 'Selesai', 'Dibatalkan'];
    if (!in_array($status, $validStatuses)) {
      throw new Exception("Status tidak valid.");
    }

    $sql = "UPDATE orders SET status = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
      throw new Exception("Prepare statement for update status failed: " . $conn->error);
    }
    $stmt->bind_param("si", $status, $orderId);
    
    if (!$stmt->execute()) {
      throw new Exception("Gagal mengupdate status: " . $stmt->error);
    }
    
    if ($stmt->affected_rows === 0) {
      throw new Exception("Order tidak ditemukan atau status tidak berubah.");
    }
    
    $stmt->close();

    ob_end_clean(); // Clean buffer before JSON output
    echo json_encode([
      "status" => "success",
      "message" => "Status berhasil diupdate"
    ]);

  } else {
    throw new Exception("Aksi tidak valid.");
  }

} catch (Exception $e) {
  error_log("seller_dashboard.php: Error - " . $e->getMessage());
  ob_end_clean(); // Clean buffer before JSON output
  echo json_encode([
    "status" => "error",
    "message" => $e->getMessage()
  ]);
}

// Pastikan koneksi ditutup di akhir
if ($conn) {
    $conn->close();
}
error_log("seller_dashboard.php: Script finished.");
?> 