<?php
include 'db_connect.php';

// The user's username and the game results are sent from Flutter
$username = $_POST['username'];
$resultsData = $_POST['results_data'];

// First, get the user's ID based on their username
$stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();
    $userId = $user['id'];

    // Now, insert the game results into the new table
    $insertStmt = $conn->prepare("INSERT INTO game_results (user_id, results_data) VALUES (?, ?)");
    // 's' for string, as we're sending the data as a JSON string
    $insertStmt->bind_param("is", $userId, $resultsData); 
    
    if ($insertStmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Results saved successfully."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to save results."]);
    }
    $insertStmt->close();

} else {
    echo json_encode(["status" => "error", "message" => "User not found."]);
}

$stmt->close();
$conn->close();
?>