-- ============================================================
-- DBGuard - Migração 001: Sistema de vencimento + status pending
-- Execute como root: mysql -u root -p dbguard < migration_001_vencimento.sql
-- Esta migração é não-destrutiva: nenhum dado é apagado.
-- ============================================================

-- ------------------------------------------------------------
-- PARTE 1: Corrigir enum de status em dbguard_users
-- Mapeamento: inactive(antigo,=pendente) -> pending
--             suspended(antigo, =desativado) -> inactive
-- ------------------------------------------------------------

-- 1.1 Ampliar o enum para conter os 4 valores temporariamente
ALTER TABLE dbguard_users
  MODIFY status ENUM('pending','active','inactive','suspended') DEFAULT 'pending';

-- 1.2 Migrar dados: quem estava "inactive" (pendente de aprovação) vira "pending"
UPDATE dbguard_users SET status = 'pending' WHERE status = 'inactive';

-- 1.3 Migrar dados: quem estava "suspended" (desativado) vira "inactive"
UPDATE dbguard_users SET status = 'inactive' WHERE status = 'suspended';

-- 1.4 Reduzir o enum ao conjunto final (suspended não é mais usado)
ALTER TABLE dbguard_users
  MODIFY status ENUM('pending','active','inactive') DEFAULT 'pending';


-- ------------------------------------------------------------
-- PARTE 2: Adicionar colunas de vencimento em dbguard_subscriptions
-- ------------------------------------------------------------

ALTER TABLE dbguard_subscriptions
  ADD COLUMN grace_until TIMESTAMP NULL AFTER expires_at,
  ADD COLUMN warned_at   TIMESTAMP NULL AFTER grace_until;


-- ------------------------------------------------------------
-- PARTE 3: Tornar max_servers opcional em dbguard_plans
-- (coluna legada, não usada pelo código atual, mas é NOT NULL
--  e travaria futuros INSERTs de planos novos)
-- ------------------------------------------------------------

ALTER TABLE dbguard_plans
  MODIFY max_servers INT NOT NULL DEFAULT 0;


-- ------------------------------------------------------------
-- PARTE 4: Atualizar planos existentes para a nova especificação
-- (decisão confirmada: atualizar Starter/Business, renomear
--  Enterprise -> Premium, ajustar Free, criar Professional)
-- ------------------------------------------------------------

-- 4.1 Free (id 4) -> 2GB, 1 arquivo, 7 dias retenção, gratuito
UPDATE dbguard_plans
SET price = 0.00, storage_limit_gb = 2, max_files = 1, backup_retention_days = 7,
    description = 'Plano gratuito - Ideal para teste'
WHERE name = 'Free';

-- 4.2 Starter (id 1) -> R$19,90 / 10GB / 5 arquivos / 3 dias retenção
UPDATE dbguard_plans
SET price = 19.90, storage_limit_gb = 10, max_files = 5, backup_retention_days = 3,
    description = 'Ideal para pequenas empresas'
WHERE name = 'Starter';

-- 4.3 Business (id 2) -> R$79,90 / 100GB / 50 arquivos / 15 dias retenção
UPDATE dbguard_plans
SET price = 79.90, storage_limit_gb = 100, max_files = 50, backup_retention_days = 15,
    description = 'Para grandes empresas'
WHERE name = 'Business';

-- 4.4 Enterprise (id 3) -> renomeado para Premium
UPDATE dbguard_plans
SET name = 'Premium', price = 999.99, storage_limit_gb = 1000, max_files = 500,
    backup_retention_days = 30,
    description = 'Solução completa sob consulta'
WHERE name = 'Enterprise';

-- 4.5 Professional -> novo plano (só insere se ainda não existir)
INSERT INTO dbguard_plans (name, description, price, storage_limit_gb, max_servers, max_files, backup_retention_days)
SELECT 'Professional', 'Para empresas em crescimento - Mais popular', 39.90, 40, 0, 20, 7
WHERE NOT EXISTS (SELECT 1 FROM dbguard_plans WHERE name = 'Professional');


-- ------------------------------------------------------------
-- Conferência final
-- ------------------------------------------------------------
SELECT id, name, price, storage_limit_gb, max_files, backup_retention_days FROM dbguard_plans ORDER BY id;
SELECT status, COUNT(*) AS total FROM dbguard_users GROUP BY status;
DESCRIBE dbguard_subscriptions;
