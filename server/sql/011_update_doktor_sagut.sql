/* ============================================================
   TEMPORARY UPDATE SCRIPT  (delete this file once the whole team
   and every server has run it)

   What it changes
   - DOKTOR: adds employment_status and place_of_work to applicants
   - SAGUT : only updates the `remarks` column comment
             ('Waiting' is a UI option, remarks is free text, so
             no real schema change is needed)

   Already included in 008_doktor_database.sql and 004_sagut_database.sql,
   so a FRESH install does not need this file.

   Safe to run more than once: it only adds a column if it is missing.
   Run the whole script in MySQL Workbench. Back up first.
   ============================================================ */


/* ============================================================
   1. DOKTOR - employment status + place of work
   ============================================================ */

USE lgu_doktor;

SET @has_status := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'lgu_doktor'
      AND TABLE_NAME = 'applicants'
      AND COLUMN_NAME = 'employment_status'
);
SET @sql := IF(@has_status = 0,
    'ALTER TABLE applicants ADD COLUMN employment_status VARCHAR(30) NULL AFTER gwa_review_for_board',
    'SELECT ''employment_status already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_place := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'lgu_doktor'
      AND TABLE_NAME = 'applicants'
      AND COLUMN_NAME = 'place_of_work'
);
SET @sql := IF(@has_place = 0,
    'ALTER TABLE applicants ADD COLUMN place_of_work VARCHAR(255) NULL AFTER employment_status',
    'SELECT ''place_of_work already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SHOW COLUMNS FROM applicants LIKE 'employment_status';
SHOW COLUMNS FROM applicants LIKE 'place_of_work';


/* ============================================================
   2. SAGUT - document the remarks values (no data change)
   ============================================================ */

USE lgu_sagut;

ALTER TABLE applicants
    MODIFY `remarks` VARCHAR(100) NULL
    COMMENT 'Ongoing = selected, Waiting = not selected, Dropped';
