<?php
include 'db_connect.php';

// The ID of the specific game result is sent from Flutter
$resultId = $_GET['id'];

$stmt = $conn->prepare("SELECT results_data FROM game_results WHERE id = ?");
$stmt->bind_param("i", $resultId);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    // The data is already stored as JSON, so we just echo it.
    // We decode and re-encode to ensure it's valid JSON being sent back.
    echo json_encode(["status" => "success", "data" => json_decode($row['results_data'])]);
} else {
    echo json_encode(["status" => "error", "message" => "Result not found."]);
}

$stmt->close();
$conn->close();
?>