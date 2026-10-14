/* ============================================================
   DELETING A BATCH ALSO DELETES ITS PEOPLE

   After this script, this command:

       DELETE FROM lgu_gip.gip_batches WHERE id = 2;

   also deletes:
     - every application in that batch (and its requirements
       and supporting documents)
     - every person in `applicants` who is ONLY in that batch

   A person who is also in another batch is kept, and so is
   their record in that other batch.

   THIS CANNOT BE UNDONE. Back up first:
   Server > Data Export > lgu_gip

   Run ONCE (MySQL Workbench: run the whole script).
   To remove this behavior later:
       DROP TRIGGER lgu_gip.trg_gip_batches_before_delete;
   ============================================================ */

USE lgu_gip;

DROP TRIGGER IF EXISTS trg_gip_batches_before_delete;

DELIMITER $$

CREATE TRIGGER trg_gip_batches_before_delete
BEFORE DELETE ON gip_batches
FOR EACH ROW
BEGIN
    /* 1. People who are only in this batch.
          Deleting them also deletes their applications,
          requirements, supporting documents and classifications
          (those tables already cascade from applicants). */
    DELETE FROM applicants
    WHERE id IN (
        SELECT applicant_id
        FROM applications
        WHERE batch_id = OLD.id
    )
    AND id NOT IN (
        SELECT applicant_id
        FROM applications
        WHERE batch_id <> OLD.id
    );

    /* 2. What is left in this batch belongs to people who are
          also in other batches. Remove only their record here. */
    DELETE FROM applications
    WHERE batch_id = OLD.id;
END$$

DELIMITER ;

SHOW TRIGGERS FROM lgu_gip;

/* ============================================================


USE lgu_gip;

DROP TRIGGER IF EXISTS trg_gip_batches_before_delete;

DELIMITER $$

CREATE TRIGGER trg_gip_batches_before_delete
BEFORE DELETE ON gip_batches
FOR EACH ROW
BEGIN
    DELETE FROM applicants
    WHERE id IN (
        SELECT applicant_id
        FROM applications
        WHERE batch_id = OLD.id
    )
    AND id NOT IN (
        SELECT applicant_id
        FROM applications
        WHERE batch_id <> OLD.id
    );

    DELETE FROM applications
    WHERE batch_id = OLD.id;
END$$

DELIMITER ;

   ============================================================ */