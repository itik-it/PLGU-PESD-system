/* ============================================================
   SAGUT: field changes
     - split `name` into last / first / middle name
     - add "Awards Received" (below the GWA columns)
     - remove "Application Number" and "School Year Applied"

   Run ONCE (MySQL Workbench). Back up first:
   Server > Data Export > lgu_sagut

   Removing a column deletes its data for good.
   ============================================================ */

USE lgu_sagut;


/* 1. New name columns and the awards column */

ALTER TABLE applicants
    ADD COLUMN last_name   VARCHAR(100) NULL AFTER `name`,
    ADD COLUMN first_name  VARCHAR(100) NULL AFTER last_name,
    ADD COLUMN middle_name VARCHAR(100) NULL AFTER first_name,
    ADD COLUMN awards_received VARCHAR(255) NULL AFTER gwa_4th_year_2nd_sem;


/* 2. Copy the existing names into the new columns.

      "Dela Cruz, Juan P."  ->  last = Dela Cruz,  first = Juan P.
      "Juan Dela Cruz"      ->  last = Juan Dela Cruz, first = (empty)

   A single old name cannot be split reliably, so the middle name stays
   empty and some rows need a manual check (step 6 lists them). */

UPDATE applicants
SET last_name = CASE
        WHEN LOCATE(',', `name`) > 0 THEN TRIM(SUBSTRING_INDEX(`name`, ',', 1))
        ELSE TRIM(`name`)
    END,
    first_name = CASE
        WHEN LOCATE(',', `name`) > 0 THEN TRIM(SUBSTRING(`name`, LOCATE(',', `name`) + 1))
        ELSE ''
    END
WHERE id > 0;


/* 3. Last name and first name are required from now on */

ALTER TABLE applicants
    MODIFY last_name  VARCHAR(100) NOT NULL,
    MODIFY first_name VARCHAR(100) NOT NULL;


/* 4. Keep the old name column for now (renamed, no longer required) and
      move the name index to the new columns.
      After checking the result you can remove it with:
          ALTER TABLE applicants DROP COLUMN name_old; */

ALTER TABLE applicants DROP INDEX idx_sagut_name;

ALTER TABLE applicants
    CHANGE COLUMN `name` name_old VARCHAR(150) NULL
        COMMENT 'Old single-field name. Drop after checking the split.';

ALTER TABLE applicants
    ADD KEY idx_sagut_name (last_name, first_name);


/* 5. Remove Application Number and School Year Applied
      (their indexes go first, then the columns) */

ALTER TABLE applicants
    DROP INDEX uq_sagut_application_number,
    DROP INDEX idx_sagut_school_year;

ALTER TABLE applicants
    DROP COLUMN application_number,
    DROP COLUMN school_year_applied;


/* 6. Rows to review: the old name had no comma, so first name is empty */

SELECT id, name_old, last_name, first_name
FROM applicants
WHERE first_name = '';
