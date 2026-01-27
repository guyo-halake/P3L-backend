CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    client_id INT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(100),
    github_repo VARCHAR(255),
    vercel_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -- FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);