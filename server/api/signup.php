<?php
include 'db_connect.php';

$username = $_POST['username'];
$password = $_POST['password'];

// Hashing the password is a critical security step.
$hashed_password = password_hash($password, PASSWORD_DEFAULT);

// Check if username already exists
$stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    echo json_encode(["status" => "error", "message" => "Username already exists."]);
} else {
    // Insert new user
    $stmt = $conn->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    $stmt->bind_param("ss", $username, $hashed_password);
    if ($stmt->execute()) {
        // --- MODIFICATION ---
        // Instead of a generic message, return the same response as a successful login.
        // This tells the app that the user is now authenticated.
        echo json_encode([
            "status" => "success", 
            "username" => $username, 
            "message" => "Signup successful!"
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error: " . $stmt->error]);
    }
}

$stmt->close();
$conn->close();
?>