<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// DEBUG: Log session content before checking
error_log("Auth Check: SESSION content: " . print_r($_SESSION, true));

// Check if user is logged in and is a seller
if (!isset($_SESSION['loggedInUserId']) || $_SESSION['loggedInUserRole'] !== 'seller') {
    error_log("Auth Check: Redirecting due to invalid user ID or role: UserID=" . ($_SESSION['loggedInUserId'] ?? 'N/A') . ", Role=" . ($_SESSION['loggedInUserRole'] ?? 'N/A'));
    // If not logged in or not a seller, redirect to login page
    header('Location: ../index.html'); // Adjust the path as necessary
    exit();
}

// Optional: Revalidate user data from database if needed, for more robust security
// include 'db.php';
// $userId = $_SESSION['loggedInUserId'];
// $stmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
// $stmt->bind_param("i", $userId);
// $stmt->execute();
// $result = $stmt->get_result();
// if ($result->num_rows === 0 || $result->fetch_assoc()['role'] !== 'seller') {
//     session_unset();
//     session_destroy();
//     header('Location: ../index.html');
//     exit();
// }
// $stmt->close();
?> 