-- messages.sql
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_user INT NOT NULL,
    to_user INT NOT NULL,
    message TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    delivered BOOLEAN DEFAULT FALSE,
    `read` BOOLEAN DEFAULT FALSE,
    group_id INT DEFAULT NULL,
    is_project TINYINT(1) DEFAULT 0,
    project_id INT DEFAULT NULL,
    file_url TEXT DEFAULT NULL,
    is_pinned TINYINT(1) DEFAULT 0,
    FOREIGN KEY (from_user) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user) REFERENCES users(id) ON DELETE CASCADE,
    KEY idx_group_id (group_id)
);