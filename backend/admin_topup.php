<?php
ob_start(); // Start output buffering at the very beginning
ini_set('display_errors', 1); // Enable error display for debugging
error_reporting(E_ALL); // Report all errors for debugging

require_once 'db.php'; // Aktifkan kembali koneksi database jika diperlukan untuk menyimpan permintaan

header('Content-Type: application/json');

$response = ['status' => 'error', 'message' => 'Aksi tidak valid atau tidak didukung.'];

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $topupAmount = $_POST['topupAmount'] ?? null;

        // Validasi input
        if (empty($topupAmount) || !is_numeric($topupAmount) || $topupAmount <= 0) {
            throw new Exception('Jumlah top up tidak valid.');
        }

        // Tangani unggahan file bukti transfer
        $proofImagePath = null;
        if (isset($_FILES['proofImage']) && $_FILES['proofImage']['error'] === UPLOAD_ERR_OK) {
            $fileTmpPath = $_FILES['proofImage']['tmp_name'];
            $fileName = $_FILES['proofImage']['name'];
            $fileSize = $_FILES['proofImage']['size'];
            $fileType = $_FILES['proofImage']['type'];
            $fileNameCmps = explode(".", $fileName);
            $fileExtension = strtolower(end($fileNameCmps));

            $newFileName = md5(time() . $fileName) . '.' . $fileExtension;
            $uploadFileDir = '../aset/bukti_transfer/';
            $destPath = $uploadFileDir . $newFileName;

            if (!is_dir($uploadFileDir)) {
                mkdir($uploadFileDir, 0777, true); // Buat direktori jika tidak ada
            }

            if (move_uploaded_file($fileTmpPath, $destPath)) {
                $proofImagePath = $newFileName; // Simpan hanya nama file untuk database
            } else {
                throw new Exception('Gagal memindahkan file yang diunggah.');
            }
        } else {
            throw new Exception('Bukti transfer tidak ditemukan atau ada kesalahan unggahan.');
        }

        // --- Placeholder untuk integrasi WhatsApp --- START
        // Di sini Anda akan mengintegrasikan WhatsApp Business API atau penyedia API pihak ketiga (misal: Twilio, MessageBird)
        // Data yang perlu Anda kirim:
        $message = "Permintaan Top Up Baru:\n"
                 . "Jumlah: Rp " . number_format($topupAmount, 0, ',', '.') . "\n"
                 . "Bukti Transfer: " . (isset($_SERVER['HTTP_HOST']) ? "http://" . $_SERVER['HTTP_HOST'] . "/kantinITH_buyer_module/aset/bukti_transfer/" . $proofImagePath : "[Path lokal: " . $destPath . "]");

        $whatsappAdminNumber = "+6281234567890"; // Ganti dengan nomor WhatsApp admin yang sebenarnya

        // Contoh bagaimana Anda akan memanggil API WhatsApp (ini adalah kode placeholder)
        // require __DIR__ . '/vendor/autoload.php'; // Jika menggunakan Twilio PHP SDK
        // use Twilio\Rest\Client;
        // $sid = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'; // Ganti dengan SID Twilio Anda
        // $token = 'your_auth_token'; // Ganti dengan Auth Token Twilio Anda
        // $twilio = new Client($sid, $token);
        // $twilio->messages
        //        ->create("whatsapp:" . $whatsappAdminNumber, // to
        //               array(
        //                   "from" => "whatsapp:+1xxxxxxxxxx", // from (nomor Twilio WhatsApp Anda)
        //                   "body" => $message
        //               )
        //        );
        // --- Placeholder untuk integrasi WhatsApp --- END

        // Anda bisa juga menyimpan permintaan top-up ke database jika diperlukan
        // if (isset($conn)) {
        //     $stmt = $conn->prepare("INSERT INTO topup_requests (user_id, amount, proof_image_path, status) VALUES (?, ?, ?, 'pending')");
        //     $stmt->execute([$_SESSION['loggedInUserId'], $topupAmount, $proofImagePath]);
        // }

        $response = ['status' => 'success', 'message' => 'Permintaan top up berhasil dikirim ke admin via WhatsApp!'];

    } else {
        throw new Exception('Metode permintaan tidak didukung.');
    }
} catch (Exception $e) {
    $response = ['status' => 'error', 'message' => 'Error: ' . $e->getMessage()];
}
ob_clean();
echo json_encode($response);
ob_end_flush();
exit;
?> 