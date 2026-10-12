/* ============================================================
   GIP BATCHES
   Run ONCE (MySQL Workbench). Back up first:
   Server > Data Export > lgu_gip
   ============================================================ */

USE lgu_gip;


/* One row per batch, e.g. "GIP 2026 - Batch 1" */

CREATE TABLE IF NOT EXISTS gip_batches (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    batch_year SMALLINT UNSIGNED NOT NULL,

    batch_no TINYINT UNSIGNED NOT NULL,

    name VARCHAR(100) NOT NULL,

    status ENUM('open', 'closed') NOT NULL DEFAULT 'open',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_gip_batches_year_no (batch_year, batch_no)
);


/* The batch that the existing records belong to */

INSERT IGNORE INTO gip_batches
    (batch_year, batch_no, name)
VALUES
    (2026, 1, 'GIP 2026 - Batch 1');


/* Link applications to a batch */

ALTER TABLE applications
    ADD COLUMN batch_id INT UNSIGNED NULL
        AFTER applicant_id;


/* Put every existing application into GIP 2026 - Batch 1 */

UPDATE applications
SET batch_id = (
    SELECT id FROM gip_batches
    WHERE batch_year = 2026 AND batch_no = 1
)
WHERE id > 0 AND batch_id IS NULL;


/* Now every application has a batch, so make it required */

ALTER TABLE applications
    MODIFY batch_id INT UNSIGNED NOT NULL,

    ADD INDEX idx_applications_batch (batch_id),

    ADD CONSTRAINT fk_applications_batch
        FOREIGN KEY (batch_id)
        REFERENCES gip_batches(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;


/* Check */

SELECT b.name, COUNT(a.id) AS applications
FROM gip_batches b
LEFT JOIN applications a ON a.batch_id = b.id
GROUP BY b.id;
