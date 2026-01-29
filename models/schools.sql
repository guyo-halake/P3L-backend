-- Schools table for School Module
CREATE TABLE IF NOT EXISTS schools (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  logo_url VARCHAR(512),
  website_url VARCHAR(512),
  portal_url VARCHAR(512),
  student_email VARCHAR(255),
  student_number VARCHAR(100),
  phone VARCHAR(32),
  status VARCHAR(32) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Units/Modules table (linked to schools)
CREATE TABLE IF NOT EXISTS school_units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  lecturer VARCHAR(255),
  schedule VARCHAR(255),
  progress INT DEFAULT 0,
  status VARCHAR(32) DEFAULT 'Active',
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

-- Assignments table (linked to units)
CREATE TABLE IF NOT EXISTS school_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  due_date DATETIME,
  status VARCHAR(32) DEFAULT 'Pending',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (unit_id) REFERENCES school_units(id) ON DELETE CASCADE
);

-- Labs table (linked to units)
CREATE TABLE IF NOT EXISTS school_labs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(64),
  status VARCHAR(32) DEFAULT 'Not Started',
  score INT DEFAULT 0,
  due_date DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (unit_id) REFERENCES school_units(id) ON DELETE CASCADE
);

-- Fees table (linked to schools)
CREATE TABLE IF NOT EXISTS school_fees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_id INT NOT NULL,
  date DATE,
  description VARCHAR(255),
  amount DECIMAL(10,2),
  status VARCHAR(32) DEFAULT 'Pending',
  payment_method VARCHAR(64),
  receipt_url VARCHAR(512),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

-- Transcripts/Reports table (linked to schools)
CREATE TABLE IF NOT EXISTS school_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_id INT NOT NULL,
  type VARCHAR(64),
  date DATE,
  gpa DECIMAL(4,2),
  grade_summary VARCHAR(255),
  file_url VARCHAR(512),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);
