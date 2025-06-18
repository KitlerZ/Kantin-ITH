<?php
include 'db.php';

header('Content-Type: application/json');

try {
    $sql = "SELECT * FROM menu";
    $stmt = $conn->query($sql);
    $menu = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'status' => 'success',
        'count' => count($menu),
        'data' => $menu
    ]);
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?> 