/* ============================================================
   TEMPORARY_batch_update.sql

   TEMPORARY: delete this file once the whole team and every server
   has run it.

   Adds batches to OFW, LIVELIHOOD and TUPAD (same as sections 5 to 7
   of 010_program_batches.sql, but safe to run more than once).

   What it does for each database
   1. creates the `batches` table
   2. creates "<PROGRAM> 2026 - Batch 1"
   3. adds applicants.batch_id and puts every existing row in Batch 1
   4. makes batch_id NOT NULL with an index and a foreign key
      (deleting a batch deletes its applicants)

   Run the whole script in MySQL Workbench. Back up first:
   Server > Data Export > lgu_ofw, lgu_livelihood, lgu_tupad
   Restart the server afterwards (the API paths changed).
   ============================================================ */


/* ============================================================
   1. OFW
   ============================================================ */

USE lgu_ofw;

CREATE TABLE IF NOT EXISTS batches (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    batch_year SMALLINT UNSIGNED NOT NULL,
    batch_no TINYINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_batches_year_no (batch_year, batch_no)
);

INSERT IGNORE INTO batches (batch_year, batch_no, name)
VALUES (2026, 1, 'OFW 2026 - Batch 1');

SET @has_col := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'lgu_ofw'
      AND TABLE_NAME = 'applicants'
      AND COLUMN_NAME = 'batch_id'
);
SET @sql := IF(@has_col = 0,
    'ALTER TABLE applicants ADD COLUMN batch_id INT UNSIGNED NULL AFTER id',
    'SELECT ''batch_id already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE applicants
SET batch_id = (SELECT id FROM batches WHERE batch_year = 2026 AND batch_no = 1)
WHERE id > 0 AND batch_id IS NULL;

SET @has_fk := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = 'lgu_ofw'
      AND TABLE_NAME = 'applicants'
      AND CONSTRAINT_NAME = 'fk_applicants_batch'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@has_fk = 0,
    'ALTER TABLE applicants
        MODIFY batch_id INT UNSIGNED NOT NULL,
        ADD INDEX idx_applicants_batch_id (batch_id),
        ADD CONSTRAINT fk_applicants_batch
            FOREIGN KEY (batch_id) REFERENCES batches(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE',
    'SELECT ''batch foreign key already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT b.name, COUNT(a.id) AS applicants
FROM batches b LEFT JOIN applicants a ON a.batch_id = b.id
GROUP BY b.id;


/* ============================================================
   2. LIVELIHOOD
   ============================================================ */

USE lgu_gip;

CREATE TABLE IF NOT EXISTS batches (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    batch_year SMALLINT UNSIGNED NOT NULL,
    batch_no TINYINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_batches_year_no (batch_year, batch_no)
);

INSERT IGNORE INTO batches (batch_year, batch_no, name)
VALUES (2026, 1, 'DILP 2026 - Batch 1');

SET @has_col := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'lgu_gip'
      AND TABLE_NAME = 'applicants'
      AND COLUMN_NAME = 'batch_id'
);
SET @sql := IF(@has_col = 0,
    'ALTER TABLE applicants ADD COLUMN batch_id INT UNSIGNED NULL AFTER id',
    'SELECT ''batch_id already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE applicants
SET batch_id = (SELECT id FROM batches WHERE batch_year = 2026 AND batch_no = 1)
WHERE id > 0 AND batch_id IS NULL;

SET @has_fk := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = 'lgu_dilp'
      AND TABLE_NAME = 'applicants'
      AND CONSTRAINT_NAME = 'fk_applicants_batch'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@has_fk = 0,
    'ALTER TABLE applicants
        MODIFY batch_id INT UNSIGNED NOT NULL,
        ADD INDEX idx_applicants_batch_id (batch_id),
        ADD CONSTRAINT fk_applicants_batch
            FOREIGN KEY (batch_id) REFERENCES batches(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE',
    'SELECT ''batch foreign key already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT b.name, COUNT(a.id) AS applicants
FROM batches b LEFT JOIN applicants a ON a.batch_id = b.id
GROUP BY b.id;


/* ============================================================
   3. TUPAD
   ============================================================ */

USE lgu_tupad;

CREATE TABLE IF NOT EXISTS batches (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    batch_year SMALLINT UNSIGNED NOT NULL,
    batch_no TINYINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_batches_year_no (batch_year, batch_no)
);

INSERT IGNORE INTO batches (batch_year, batch_no, name)
VALUES (2026, 1, 'TUPAD 2026 - Batch 1');

SET @has_col := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'lgu_tupad'
      AND TABLE_NAME = 'applicants'
      AND COLUMN_NAME = 'batch_id'
);
SET @sql := IF(@has_col = 0,
    'ALTER TABLE applicants ADD COLUMN batch_id INT UNSIGNED NULL AFTER id',
    'SELECT ''batch_id already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE applicants
SET batch_id = (SELECT id FROM batches WHERE batch_year = 2026 AND batch_no = 1)
WHERE id > 0 AND batch_id IS NULL;

SET @has_fk := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = 'lgu_tupad'
      AND TABLE_NAME = 'applicants'
      AND CONSTRAINT_NAME = 'fk_applicants_batch'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@has_fk = 0,
    'ALTER TABLE applicants
        MODIFY batch_id INT UNSIGNED NOT NULL,
        ADD INDEX idx_applicants_batch_id (batch_id),
        ADD CONSTRAINT fk_applicants_batch
            FOREIGN KEY (batch_id) REFERENCES batches(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE',
    'SELECT ''batch foreign key already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT b.name, COUNT(a.id) AS applicants
FROM batches b LEFT JOIN applicants a ON a.batch_id = b.id
GROUP BY b.id;
