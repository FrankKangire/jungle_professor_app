<?php
// This is mainly for logical consistency. The client handles clearing the session.
echo json_encode(["status" => "success", "message" => "Logged out."]);
?>