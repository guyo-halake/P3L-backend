-- clients.sql: Table for storing client information
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    initials VARCHAR(10),
    project VARCHAR(255),
    status VARCHAR(20),
    lastMessage TEXT,
    unread INT DEFAULT 0,
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);