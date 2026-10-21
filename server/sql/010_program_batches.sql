/* ============================================================
   BATCHES FOR DOKTOR, GUWIP, SAGUT, TRPATU, OFW, LIVELIHOOD AND TUPAD
   Same idea as 003_gip_batches.sql.

   Run ONCE (MySQL Workbench, run the whole script).
   Back up first: Server > Data Export > lgu_doktor, lgu_guwip, lgu_sagut,
                  lgu_trpatu, lgu_ofw, lgu_livelihood, lgu_tupad

   Already ran sections 1 to 4 earlier?
   Do NOT run the whole file again. Run only sections 5 to 7, or just
   run TEMPORARY_batch_update.sql (safe to re-run, does only OFW,
   LIVELIHOOD and TUPAD).

   Fresh install order: sections 5 to 7 need lgu_ofw, lgu_livelihood and
   lgu_tupad to exist, so run 011_ofw_database.sql, 012_livelihood_database.sql
   and 013_tupad_database.sql BEFORE sections 5 to 7.

   Deleting a batch row deletes its applicants (ON DELETE CASCADE).
   ============================================================ */


/* ============================================================
   1. DOKTOR
   Existing rows used the text column `batch` ("Batch 1".."Batch 4").
   They are moved into real batches (2026 - Batch 1..4), then the
   old column is dropped.
   ============================================================ */

USE lgu_doktor;

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

INSERT IGNORE INTO batches (batch_year, batch_no, name) VALUES
    (2026, 1, 'DOKTOR 2026 - Batch 1'),
    (2026, 2, 'DOKTOR 2026 - Batch 2'),
    (2026, 3, 'DOKTOR 2026 - Batch 3'),
    (2026, 4, 'DOKTOR 2026 - Batch 4');

ALTER TABLE applicants
    ADD COLUMN batch_id INT UNSIGNED NULL AFTER id;

/* "Batch 3" -> batch_no 3 */
UPDATE applicants a
JOIN batches b
  ON b.batch_year = 2026
 AND b.batch_no = CAST(SUBSTRING_INDEX(a.batch, ' ', -1) AS UNSIGNED)
SET a.batch_id = b.id
WHERE a.id > 0 AND a.batch_id IS NULL;

/* Anything without a valid batch goes to Batch 1 */
UPDATE applicants
SET batch_id = (SELECT id FROM batches WHERE batch_year = 2026 AND batch_no = 1)
WHERE id > 0 AND batch_id IS NULL;

ALTER TABLE applicants
    MODIFY batch_id INT UNSIGNED NOT NULL,
    ADD INDEX idx_applicants_batch_id (batch_id),
    ADD CONSTRAINT fk_applicants_batch
        FOREIGN KEY (batch_id) REFERENCES batches(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE;

ALTER TABLE applicants
    DROP INDEX idx_applicants_batch,
    DROP COLUMN batch;

SELECT b.name, COUNT(a.id) AS applicants
FROM batches b LEFT JOIN applicants a ON a.batch_id = b.id
GROUP BY b.id;


/* ============================================================
   2. GUWIP
   ============================================================ */

USE lgu_guwip;

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
VALUES (2026, 1, 'GUWIP 2026 - Batch 1');

ALTER TABLE applicants
    ADD COLUMN batch_id INT UNSIGNED NULL AFTER id;

UPDATE applicants
SET batch_id = (SELECT id FROM batches WHERE batch_year = 2026 AND batch_no = 1)
WHERE id > 0 AND batch_id IS NULL;

ALTER TABLE applicants
    MODIFY batch_id INT UNSIGNED NOT NULL,
    ADD INDEX idx_applicants_batch_id (batch_id),
    ADD CONSTRAINT fk_applicants_batch
        FOREIGN KEY (batch_id) REFERENCES batches(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE;

SELECT b.name, COUNT(a.id) AS applicants
FROM batches b LEFT JOIN applicants a ON a.batch_id = b.id
GROUP BY b.id;


/* ============================================================
   3. SAGUT
   Existing rows used the text column `batch` ("Batch 1".."Batch 9").
   A batch (2026 - Batch N) is created for every value found in the
   data, plus Batch 1, then the old column is dropped.
   ============================================================ */

USE lgu_sagut;

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
VALUES (2026, 1, 'SAGUT 2026 - Batch 1');

/* One batch per distinct "Batch N" value already in the data */
INSERT IGNORE INTO batches (batch_year, batch_no, name)
SELECT DISTINCT 2026, x.n, CONCAT('SAGUT 2026 - Batch ', x.n)
FROM (
    SELECT CAST(SUBSTRING_INDEX(batch, ' ', -1) AS UNSIGNED) AS n
    FROM applicants
    WHERE batch REGEXP '^Batch [0-9]+$'
) x
WHERE x.n BETWEEN 1 AND 255;

ALTER TABLE applicants
    ADD COLUMN batch_id INT UNSIGNED NULL AFTER id;

UPDATE applicants a
JOIN batches b
  ON b.batch_year = 2026
 AND a.batch REGEXP '^Batch [0-9]+$'
 AND b.batch_no = CAST(SUBSTRING_INDEX(a.batch, ' ', -1) AS UNSIGNED)
SET a.batch_id = b.id
WHERE a.id > 0 AND a.batch_id IS NULL;

/* Anything without a valid batch goes to Batch 1 */
UPDATE applicants
SET batch_id = (SELECT id FROM batches WHERE batch_year = 2026 AND batch_no = 1)
WHERE id > 0 AND batch_id IS NULL;

ALTER TABLE applicants
    MODIFY batch_id INT UNSIGNED NOT NULL,
    ADD INDEX idx_applicants_batch_id (batch_id),
    ADD CONSTRAINT fk_applicants_batch
        FOREIGN KEY (batch_id) REFERENCES batches(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE;

ALTER TABLE applicants
    DROP INDEX idx_sagut_batch,
    DROP COLUMN batch;

SELECT b.name, COUNT(a.id) AS applicants
FROM batches b LEFT JOIN applicants a ON a.batch_id = b.id
GROUP BY b.id;


/* ============================================================
   4. TRPATU
   ============================================================ */

USE lgu_trpatu;

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
VALUES (2026, 1, 'TRPATU 2026 - Batch 1');

ALTER TABLE applicants
    ADD COLUMN batch_id INT UNSIGNED NULL AFTER id;

UPDATE applicants
SET batch_id = (SELECT id FROM batches WHERE batch_year = 2026 AND batch_no = 1)
WHERE id > 0 AND batch_id IS NULL;

ALTER TABLE applicants
    MODIFY batch_id INT UNSIGNED NOT NULL,
    ADD INDEX idx_applicants_batch_id (batch_id),
    ADD CONSTRAINT fk_applicants_batch
        FOREIGN KEY (batch_id) REFERENCES batches(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE;

SELECT b.name, COUNT(a.id) AS applicants
FROM batches b LEFT JOIN applicants a ON a.batch_id = b.id
GROUP BY b.id;


/* ============================================================
   5. OFW
   These tables had no batch column. All existing rows go into
   "OFW 2026 - Batch 1".
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

ALTER TABLE applicants
    ADD COLUMN batch_id INT UNSIGNED NULL AFTER id;

UPDATE applicants
SET batch_id = (SELECT id FROM batches WHERE batch_year = 2026 AND batch_no = 1)
WHERE id > 0 AND batch_id IS NULL;

ALTER TABLE applicants
    MODIFY batch_id INT UNSIGNED NOT NULL,
    ADD INDEX idx_applicants_batch_id (batch_id),
    ADD CONSTRAINT fk_applicants_batch
        FOREIGN KEY (batch_id) REFERENCES batches(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE;

SELECT b.name, COUNT(a.id) AS applicants
FROM batches b LEFT JOIN applicants a ON a.batch_id = b.id
GROUP BY b.id;


/* ============================================================
   6. LIVELIHOOD
   All existing rows go into "LIVELIHOOD 2026 - Batch 1".
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
   7. TUPAD
   All existing rows go into "TUPAD 2026 - Batch 1".
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

ALTER TABLE applicants
    ADD COLUMN batch_id INT UNSIGNED NULL AFTER id;

UPDATE applicants
SET batch_id = (SELECT id FROM batches WHERE batch_year = 2026 AND batch_no = 1)
WHERE id > 0 AND batch_id IS NULL;

ALTER TABLE applicants
    MODIFY batch_id INT UNSIGNED NOT NULL,
    ADD INDEX idx_applicants_batch_id (batch_id),
    ADD CONSTRAINT fk_applicants_batch
        FOREIGN KEY (batch_id) REFERENCES batches(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE;

SELECT b.name, COUNT(a.id) AS applicants
FROM batches b LEFT JOIN applicants a ON a.batch_id = b.id
GROUP BY b.id;
