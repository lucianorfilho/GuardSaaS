-- DBGuard - Schema MySQL
-- Execute como root: mysql -u root -p < schema.sql

use dbguard;

-- Usuários
CREATE TABLE IF NOT EXISTS dbguard_users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','client') DEFAULT 'client',
  status        ENUM('active','inactive','suspended') DEFAULT 'active',
  phone         VARCHAR(30),
  company       VARCHAR(150),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Planos
CREATE TABLE IF NOT EXISTS dbguard_plans (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  name                  VARCHAR(100) NOT NULL,
  description           VARCHAR(500),
  price                 DECIMAL(10,2) NOT NULL,
  storage_limit_gb      INT NOT NULL,
  max_servers           INT NOT NULL,
  backup_retention_days INT DEFAULT 30,
  status                ENUM('active','inactive') DEFAULT 'active',
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assinaturas
CREATE TABLE IF NOT EXISTS dbguard_subscriptions (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES dbguard_users(id),
  plan_id    INT NOT NULL REFERENCES dbguard_plans(id),
  status     ENUM('active','expired','cancelled') DEFAULT 'active',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Servidores
CREATE TABLE IF NOT EXISTS dbguard_servers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES dbguard_users(id),
  name          VARCHAR(150) NOT NULL,
  hostname      VARCHAR(255),
  ip_address    VARCHAR(50),
  os_type       VARCHAR(50),
  agent_version VARCHAR(30),
  agent_token   VARCHAR(255) UNIQUE,
  status        ENUM('online','offline','error') DEFAULT 'offline',
  last_seen_at  TIMESTAMP NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Configurações de Storage
CREATE TABLE IF NOT EXISTS dbguard_storage_configs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES dbguard_users(id),
  provider     ENUM('s3','backblaze','oci','wasabi','custom') NOT NULL,
  name         VARCHAR(100) NOT NULL,
  bucket_name  VARCHAR(255),
  region       VARCHAR(100),
  access_key   VARCHAR(255),
  secret_key   VARCHAR(255),
  endpoint_url VARCHAR(500),
  is_default   TINYINT(1) DEFAULT 0,
  status       ENUM('active','inactive') DEFAULT 'active',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Jobs de Backup
CREATE TABLE IF NOT EXISTS dbguard_backup_jobs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  server_id     INT NOT NULL REFERENCES dbguard_servers(id),
  user_id       INT NOT NULL REFERENCES dbguard_users(id),
  storage_id    INT REFERENCES dbguard_storage_configs(id),
  job_name      VARCHAR(150) NOT NULL,
  backup_type   ENUM('full','incremental','differential','database','files') NOT NULL,
  status        ENUM('pending','running','success','failed','cancelled') DEFAULT 'pending',
  file_name     VARCHAR(500),
  file_size_mb  DECIMAL(15,2),
  storage_path  VARCHAR(1000),
  started_at    TIMESTAMP NULL,
  finished_at   TIMESTAMP NULL,
  error_message TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alertas
CREATE TABLE IF NOT EXISTS dbguard_alerts (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES dbguard_users(id),
  server_id  INT REFERENCES dbguard_servers(id),
  job_id     INT REFERENCES dbguard_backup_jobs(id),
  type       VARCHAR(50) NOT NULL,
  severity   ENUM('info','warning','error','critical') DEFAULT 'info',
  message    TEXT NOT NULL,
  is_read    TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dados iniciais
INSERT INTO dbguard_plans (name, description, price, storage_limit_gb, max_servers, backup_retention_days) VALUES
('Starter',    'Ideal para pequenas empresas',    49.90,  100,  3,  30),
('Business',   'Para empresas em crescimento',   129.90,  500, 10,  60),
('Enterprise', 'Solução completa sem limites',   299.90, 2000, 50,  90);

INSERT INTO dbguard_users (name, email, password_hash, role) VALUES
('Administrador', 'admin@dbguard.com.br', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
