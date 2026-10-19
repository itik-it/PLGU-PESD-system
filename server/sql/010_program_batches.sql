/* ============================================================
   BATCHES FOR DOKTOR, GUWIP AND TRPATU
   Same idea as 003_gip_batches.sql.

   Run ONCE (MySQL Workbench, run the whole script).
   Back up first: Server > Data Export > lgu_doktor, lgu_guwip, lgu_trpatu

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
   3. TRPATU
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
