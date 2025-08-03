<?php
include 'db_connect.php';

// The username is sent from Flutter as a GET parameter
$username = $_GET['username'];

$stmt = $conn->prepare("SELECT gr.id, gr.created_at FROM game_results gr JOIN users u ON gr.user_id = u.id WHERE u.username = ? ORDER BY gr.created_at DESC");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

$results = [];
while ($row = $result->fetch_assoc()) {
    $results[] = $row;
}

echo json_encode(["status" => "success", "data" => $results]);

$stmt->close();
$conn->close();
?>