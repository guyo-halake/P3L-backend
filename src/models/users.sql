CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  avatar VARCHAR(255),
  github_token VARCHAR(255),
  user_type ENUM('full_admin', 'dev') NOT NULL DEFAULT 'dev',
  wallet_balance DECIMAL(12, 2) DEFAULT 0.00,
  must_change_password TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
