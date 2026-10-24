/* Group migration for Bridging, Job Seeker, SPES and Job Vacancy.
   Back up the four databases first, then run this entire script in MySQL Workbench.
   Existing records are assigned to Batch 1. It is safe to run again. */

/* 1. BRIDGING */
USE lgu_bridging;
CREATE TABLE IF NOT EXISTS batches (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT, batch_year SMALLINT UNSIGNED NOT NULL,
  batch_no TINYINT UNSIGNED NOT NULL, name VARCHAR(100) NOT NULL,
  status ENUM('open','closed') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_batches_year_no (batch_year, batch_no)
);
INSERT IGNORE INTO batches (batch_year, batch_no, name) VALUES (2026, 1, 'Batch 1');
SET @has_col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='lgu_bridging' AND TABLE_NAME='bridging_applicants' AND COLUMN_NAME='batch_id');
SET @sql := IF(@has_col=0, 'ALTER TABLE bridging_applicants ADD COLUMN batch_id INT UNSIGNED NULL AFTER id', 'SELECT ''batch_id already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE bridging_applicants SET batch_id=(SELECT id FROM batches WHERE batch_year=2026 AND batch_no=1) WHERE batch_id IS NULL;
SET @has_fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA='lgu_bridging' AND TABLE_NAME='bridging_applicants' AND CONSTRAINT_NAME='fk_bridging_applicants_batch');
SET @sql := IF(@has_fk=0, 'ALTER TABLE bridging_applicants MODIFY batch_id INT UNSIGNED NOT NULL, ADD INDEX idx_bridging_applicants_batch_id (batch_id), ADD CONSTRAINT fk_bridging_applicants_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON UPDATE CASCADE ON DELETE CASCADE', 'SELECT ''batch foreign key already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* 2. JOB SEEKER */
USE lgu_jobseeker;
CREATE TABLE IF NOT EXISTS batches (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT, batch_year SMALLINT UNSIGNED NOT NULL, batch_no TINYINT UNSIGNED NOT NULL, name VARCHAR(100) NOT NULL,
  status ENUM('open','closed') NOT NULL DEFAULT 'open', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_batches_year_no (batch_year, batch_no)
);
INSERT IGNORE INTO batches (batch_year, batch_no, name) VALUES (2026, 1, 'Batch 1');
SET @has_col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='lgu_jobseeker' AND TABLE_NAME='applicants' AND COLUMN_NAME='batch_id');
SET @sql := IF(@has_col=0, 'ALTER TABLE applicants ADD COLUMN batch_id INT UNSIGNED NULL AFTER id', 'SELECT ''batch_id already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE applicants SET batch_id=(SELECT id FROM batches WHERE batch_year=2026 AND batch_no=1) WHERE batch_id IS NULL;
SET @has_fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA='lgu_jobseeker' AND TABLE_NAME='applicants' AND CONSTRAINT_NAME='fk_jobseeker_applicants_batch');
SET @sql := IF(@has_fk=0, 'ALTER TABLE applicants MODIFY batch_id INT UNSIGNED NOT NULL, ADD INDEX idx_jobseeker_applicants_batch_id (batch_id), ADD CONSTRAINT fk_jobseeker_applicants_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON UPDATE CASCADE ON DELETE CASCADE', 'SELECT ''batch foreign key already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* 3. SPES */
USE lgu_spes;
CREATE TABLE IF NOT EXISTS batches (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT, batch_year SMALLINT UNSIGNED NOT NULL, batch_no TINYINT UNSIGNED NOT NULL, name VARCHAR(100) NOT NULL,
  status ENUM('open','closed') NOT NULL DEFAULT 'open', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_batches_year_no (batch_year, batch_no)
);
INSERT IGNORE INTO batches (batch_year, batch_no, name) VALUES (2026, 1, 'Batch 1');
SET @has_col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='lgu_spes' AND TABLE_NAME='spes_applicants' AND COLUMN_NAME='batch_id');
SET @sql := IF(@has_col=0, 'ALTER TABLE spes_applicants ADD COLUMN batch_id INT UNSIGNED NULL AFTER id', 'SELECT ''batch_id already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE spes_applicants SET batch_id=(SELECT id FROM batches WHERE batch_year=2026 AND batch_no=1) WHERE batch_id IS NULL;
SET @has_fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA='lgu_spes' AND TABLE_NAME='spes_applicants' AND CONSTRAINT_NAME='fk_spes_applicants_batch');
SET @sql := IF(@has_fk=0, 'ALTER TABLE spes_applicants MODIFY batch_id INT UNSIGNED NOT NULL, ADD INDEX idx_spes_applicants_batch_id (batch_id), ADD CONSTRAINT fk_spes_applicants_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON UPDATE CASCADE ON DELETE CASCADE', 'SELECT ''batch foreign key already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* 4. JOB VACANCY */
USE lgu_jobvacancy;
CREATE TABLE IF NOT EXISTS batches (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT, batch_year SMALLINT UNSIGNED NOT NULL, batch_no TINYINT UNSIGNED NOT NULL, name VARCHAR(100) NOT NULL,
  status ENUM('open','closed') NOT NULL DEFAULT 'open', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_batches_year_no (batch_year, batch_no)
);
INSERT IGNORE INTO batches (batch_year, batch_no, name) VALUES (2026, 1, 'Batch 1');
SET @has_col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='lgu_jobvacancy' AND TABLE_NAME='jobvacancy_employers' AND COLUMN_NAME='batch_id');
SET @sql := IF(@has_col=0, 'ALTER TABLE jobvacancy_employers ADD COLUMN batch_id INT UNSIGNED NULL AFTER id', 'SELECT ''batch_id already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE jobvacancy_employers SET batch_id=(SELECT id FROM batches WHERE batch_year=2026 AND batch_no=1) WHERE batch_id IS NULL;
SET @has_fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA='lgu_jobvacancy' AND TABLE_NAME='jobvacancy_employers' AND CONSTRAINT_NAME='fk_jobvacancy_employers_batch');
SET @sql := IF(@has_fk=0, 'ALTER TABLE jobvacancy_employers MODIFY batch_id INT UNSIGNED NOT NULL, ADD INDEX idx_jobvacancy_employers_batch_id (batch_id), ADD CONSTRAINT fk_jobvacancy_employers_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON UPDATE CASCADE ON DELETE CASCADE', 'SELECT ''batch foreign key already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
