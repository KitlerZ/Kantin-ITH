<?php
include 'db.php';

header('Content-Type: application/json');

try {
    $query = "SELECT * FROM users";
    $result = mysqli_query($conn, $query);
    
    if (!$result) {
        throw new Exception("Error querying users table: " . mysqli_error($conn));
    }

    $users = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $users[] = $row;
    }

    echo json_encode([
        'success' => true,
        'total_users' => count($users),
        'users' => $users
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

mysqli_close($conn);
?> 
