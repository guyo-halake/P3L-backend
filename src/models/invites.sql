CREATE TABLE invites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  method VARCHAR(20) NOT NULL, -- 'email' or 'whatsapp'
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'sent', -- sent, delivered, accepted, etc.
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP NULL,
  allow_custom_credentials BOOLEAN DEFAULT FALSE,
  invite_token VARCHAR(64) UNIQUE
);
