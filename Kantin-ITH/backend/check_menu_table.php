<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

include 'db.php';

header('Content-Type: application/json');

try {
    // Check if table exists
    $result = $conn->query("SHOW TABLES LIKE 'menu'");
    if ($result->num_rows === 0) {
        throw new Exception("Table 'menu' does not exist");
    }

    // Get table structure
    $result = $conn->query("DESCRIBE menu");
    $columns = [];
    while ($row = $result->fetch_assoc()) {
        $columns[] = $row;
    }

    // Get sample data
    $result = $conn->query("SELECT * FROM menu LIMIT 1");
    $sample = $result->fetch_assoc();

    echo json_encode([
        'success' => true,
        'table_exists' => true,
        'columns' => $columns,
        'sample_data' => $sample
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?> 