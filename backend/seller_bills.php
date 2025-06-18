<?php
session_start();
header('Content-Type: application/json');
require_once 'db.php';

$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? '';

function generateMonthlyBills() {
    global $conn;
    
    try {
        // Get current month and year
        $currentMonth = date('n');
        $currentYear = date('Y');
        
        // Check if bills already exist for this month
        $stmt = $conn->prepare("SELECT COUNT(*) FROM seller_bills WHERE periode_bulan = ? AND periode_tahun = ?");
        $stmt->execute([$currentMonth, $currentYear]);
        if ($stmt->fetchColumn() > 0) {
            return ['status' => 'error', 'message' => 'Tagihan untuk bulan ini sudah dibuat'];
        }
        
        // Get all active sellers
        $stmt = $conn->prepare("SELECT id, username FROM users WHERE role = 'seller' AND status = 'active'");
        $stmt->execute();
        $sellers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($sellers)) {
            return ['status' => 'error', 'message' => 'Tidak ada penjual aktif'];
        }
        
        // Set due date to 5th of next month
        $dueDate = date('Y-m-d', strtotime('first day of next month +4 days'));
        
        // Generate bills for each seller
        $stmt = $conn->prepare("INSERT INTO seller_bills (penjual_id, total, periode_bulan, periode_tahun, due_date) VALUES (?, ?, ?, ?, ?)");
        
        foreach ($sellers as $seller) {
            $stmt->execute([$seller['id'], 100000, $currentMonth, $currentYear, $dueDate]);
        }
        
        return ['status' => 'success', 'message' => 'Tagihan bulanan berhasil dibuat'];
        
    } catch (PDOException $e) {
        error_log("Error in generateMonthlyBills: " . $e->getMessage());
        return ['status' => 'error', 'message' => 'Gagal membuat tagihan: ' . $e->getMessage()];
    }
}

function getBills($status = 'all', $month = 'all') {
    global $conn;
    
    try {
        $query = "SELECT b.*, u.username as seller_name 
                 FROM seller_bills b 
                 JOIN users u ON b.penjual_id = u.id 
                 WHERE 1=1";
        $params = [];
        
        if ($status !== 'all') {
            $query .= " AND b.status = ?";
            $params[] = $status;
        }
        
        if ($month !== 'all') {
            $query .= " AND b.periode_bulan = ?";
            $params[] = $month;
        }
        
        $query .= " ORDER BY b.created_at DESC";
        
        $stmt = $conn->prepare($query);
        $stmt->execute($params);
        $bills = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return ['status' => 'success', 'bills' => $bills];
        
    } catch (PDOException $e) {
        error_log("Error in getBills: " . $e->getMessage());
        return ['status' => 'error', 'message' => 'Gagal mengambil data tagihan'];
    }
}

function getSellerBills($penjualId, $status = 'all', $month = 'all') {
    global $conn;
    
    try {
        $query = "SELECT * FROM seller_bills WHERE penjual_id = ?";
        $params = [$penjualId];
        
        if ($status !== 'all') {
            $query .= " AND status = ?";
            $params[] = $status;
        }
        
        if ($month !== 'all') {
            $query .= " AND periode_bulan = ?";
            $params[] = $month;
        }
        
        $query .= " ORDER BY created_at DESC";
        
        $stmt = $conn->prepare($query);
        $stmt->execute($params);
        $bills = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return ['status' => 'success', 'bills' => $bills];
        
    } catch (PDOException $e) {
        error_log("Error in getSellerBills: " . $e->getMessage());
        return ['status' => 'error', 'message' => 'Gagal mengambil data tagihan'];
    }
}

function markAsPaid($billId) {
    global $conn;
    
    try {
        // Start transaction
        $conn->beginTransaction();
        
        // Get bill details
        $stmt = $conn->prepare("SELECT * FROM seller_bills WHERE id = ? AND status = 'pending'");
        $stmt->execute([$billId]);
        $bill = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$bill) {
            $conn->rollBack();
            return ['status' => 'error', 'message' => 'Tagihan tidak ditemukan atau sudah dibayar'];
        }
        
        // Update bill status
        $stmt = $conn->prepare("UPDATE seller_bills SET status = 'paid', paid_at = NOW() WHERE id = ?");
        $stmt->execute([$billId]);
        
        // Add transaction record
        $stmt = $conn->prepare("INSERT INTO transactions (user_id, jenis, jumlah, keterangan, created_at) 
                               VALUES (?, 'pemasukan_tagihan', ?, ?, NOW())");
        $stmt->execute([$bill['penjual_id'], $bill['total'], 
                       "Pembayaran tagihan bulanan ({$bill['periode_bulan']}/{$bill['periode_tahun']})"]);
        
        // Debugging: Log before admin saldo update
        error_log("MarkAsPaid: Attempting to update admin saldo. Bill Total: " . $bill['total']);

        // Update admin saldo
        // Menggunakan ID admin spesifik untuk memastikan saldo masuk ke akun admin yang benar
        // Asumsi: ID admin yang menerima pembayaran adalah 4 (sesuai contoh database admin1)
        $adminIdToUpdate = 4; // Anda bisa mengubah ini jika admin penerima adalah ID lain
        $stmt = $conn->prepare("UPDATE users SET saldo = saldo + ? WHERE id = ? AND role = 'admin'");
        $stmt->execute([$bill['total'], $adminIdToUpdate]);

        // Debugging: Log setelah update saldo admin
        error_log("MarkAsPaid: Admin saldo update query executed for Admin ID: " . $adminIdToUpdate . " with amount: " . $bill['total']);
        
        $conn->commit();
        error_log("MarkAsPaid: Transaksi berhasil di-commit untuk ID tagihan: " . $billId);
        return ['status' => 'success', 'message' => 'Tagihan berhasil ditandai sebagai lunas'];
        
    } catch (PDOException $e) {
        $conn->rollBack();
        error_log("Error in markAsPaid (PDOException): " . $e->getMessage());
        return ['status' => 'error', 'message' => 'Gagal menandai tagihan: ' . $e->getMessage()];
    }
}

// Handle requests
$response = [];

try {
    switch ($action) {
        case 'generate_bills':
            $response = generateMonthlyBills();
            break;
            
        case 'get_bills':
            $status = $data['status'] ?? 'all';
            $month = $data['month'] ?? 'all';
            $response = getBills($status, $month);
            break;
            
        case 'get_seller_bills':
            $penjualId = $data['penjual_id'] ?? 0;
            if (!$penjualId) {
                $response = ['status' => 'error', 'message' => 'ID penjual tidak valid'];
            } else {
                $status = $data['status'] ?? 'all';
                $month = $data['month'] ?? 'all';
                $response = getSellerBills($penjualId, $status, $month);
            }
            break;
            
        case 'mark_as_paid':
            $billId = $data['bill_id'] ?? 0;
            if (!$billId) {
                $response = ['status' => 'error', 'message' => 'ID tagihan tidak valid'];
            } else {
                $response = markAsPaid($billId);
            }
            break;
            
        default:
            $response = ['status' => 'error', 'message' => 'Aksi tidak valid'];
            break;
    }
} catch (Exception $e) {
    error_log("Exception in seller_bills.php: " . $e->getMessage());
    $response = ['status' => 'error', 'message' => 'Terjadi kesalahan: ' . $e->getMessage()];
}

echo json_encode($response); 