-- 004_sagut_applicants.sql
-- SAGUT Scholarship Program applicants (Provincial Scholarship of Nueva Vizcaya)

CREATE DATABASE IF NOT EXISTS `lgu_sagut`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE `lgu_sagut`;

CREATE TABLE IF NOT EXISTS `applicants` (
  `id`                    INT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- Application info
  `submission_date`       DATE         NOT NULL,

  -- Applicant
  `last_name`             VARCHAR(100) NOT NULL,
  `first_name`            VARCHAR(100) NOT NULL,
  `middle_name`           VARCHAR(100) NULL,
  `gender`                ENUM('Male','Female') NOT NULL,
  `contact_number`        VARCHAR(30)  NOT NULL,

  -- 1st screening requirements
  `family_income`         DECIMAL(12,2) NULL COMMENT 'Average 12 months family income (Php)',
  `income_sources`        VARCHAR(255) NULL,
  `municipality`          VARCHAR(100) NOT NULL,
  `barangay`              VARCHAR(100) NOT NULL,
  `years_residency`       DECIMAL(5,1) NULL COMMENT 'Years of residency in Nueva Vizcaya',

  -- Sector (checkboxes)
  `is_ip`                 TINYINT(1) NOT NULL DEFAULT 0,
  `is_women`              TINYINT(1) NOT NULL DEFAULT 0,
  `is_pwd`                TINYINT(1) NOT NULL DEFAULT 0,
  `is_urban_poor`         TINYINT(1) NOT NULL DEFAULT 0,
  `is_solo_parent_child`  TINYINT(1) NOT NULL DEFAULT 0,
  `is_four_ps`            TINYINT(1) NOT NULL DEFAULT 0,

  -- Education / admission
  `high_school`           VARCHAR(150) NULL COMMENT 'HS last attended',
  `age`                   TINYINT UNSIGNED NULL COMMENT 'Age as of filling date',
  `admission_test_date`   DATE NULL COMMENT 'Date NVSU admission test passed',
  `rating`                VARCHAR(20)  NULL,
  `course`                VARCHAR(150) NULL,
  `place_of_study`        VARCHAR(150) NULL,

  -- GWA per year level and semester
  `gwa_1st_year_1st_sem`  DECIMAL(5,2) NULL,
  `gwa_1st_year_2nd_sem`  DECIMAL(5,2) NULL,
  `gwa_2nd_year_1st_sem`  DECIMAL(5,2) NULL,
  `gwa_2nd_year_2nd_sem`  DECIMAL(5,2) NULL,
  `gwa_3rd_year_1st_sem`  DECIMAL(5,2) NULL,
  `gwa_3rd_year_2nd_sem`  DECIMAL(5,2) NULL,
  `gwa_4th_year_1st_sem`  DECIMAL(5,2) NULL,
  `gwa_4th_year_2nd_sem`  DECIMAL(5,2) NULL,

  -- Awards (below the GWA columns)
  `awards_received`       VARCHAR(255) NULL,

  -- Current employment status (checkboxes)
  `is_employed`           TINYINT(1) NOT NULL DEFAULT 0,
  `is_unemployed`         TINYINT(1) NOT NULL DEFAULT 0,
  `is_self_employed`      TINYINT(1) NOT NULL DEFAULT 0,

  -- Other
  `remarks`               VARCHAR(100) NULL COMMENT 'Ongoing = selected, Waiting = not selected, Dropped',
  `batch`                 VARCHAR(20)  NULL,

  `created_at`            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_sagut_name` (`last_name`, `first_name`),
  KEY `idx_sagut_municipality` (`municipality`, `barangay`),
  KEY `idx_sagut_batch` (`batch`),

  CONSTRAINT `chk_sagut_income`    CHECK (`family_income` IS NULL OR `family_income` >= 0),
  CONSTRAINT `chk_sagut_residency` CHECK (`years_residency` IS NULL OR `years_residency` >= 0),
  CONSTRAINT `chk_sagut_age`       CHECK (`age` IS NULL OR `age` BETWEEN 0 AND 120),
  CONSTRAINT `chk_sagut_gwa`       CHECK (
        (`gwa_1st_year_1st_sem` IS NULL OR `gwa_1st_year_1st_sem` >= 0)
    AND (`gwa_1st_year_2nd_sem` IS NULL OR `gwa_1st_year_2nd_sem` >= 0)
    AND (`gwa_2nd_year_1st_sem` IS NULL OR `gwa_2nd_year_1st_sem` >= 0)
    AND (`gwa_2nd_year_2nd_sem` IS NULL OR `gwa_2nd_year_2nd_sem` >= 0)
    AND (`gwa_3rd_year_1st_sem` IS NULL OR `gwa_3rd_year_1st_sem` >= 0)
    AND (`gwa_3rd_year_2nd_sem` IS NULL OR `gwa_3rd_year_2nd_sem` >= 0)
    AND (`gwa_4th_year_1st_sem` IS NULL OR `gwa_4th_year_1st_sem` >= 0)
    AND (`gwa_4th_year_2nd_sem` IS NULL OR `gwa_4th_year_2nd_sem` >= 0)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;