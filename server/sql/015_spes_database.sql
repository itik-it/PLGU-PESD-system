-- SPES application form
CREATE DATABASE IF NOT EXISTS lgu_spes
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lgu_spes;

CREATE TABLE IF NOT EXISTS spes_applicants (
  id                      INT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- Name
  last_name               VARCHAR(100) NOT NULL,
  first_name              VARCHAR(100) NOT NULL,
  middle_name             VARCHAR(100) DEFAULT NULL,

  sex                     ENUM('Male','Female') DEFAULT NULL,
  birthdate               DATE DEFAULT NULL,
  place_of_birth          VARCHAR(255) DEFAULT NULL,
  civil_status            VARCHAR(30)  DEFAULT NULL,   -- "Status"
  citizenship             VARCHAR(100) DEFAULT NULL,

  email                   VARCHAR(150) DEFAULT NULL,
  social_media_account    VARCHAR(200) DEFAULT NULL,
  gsis_beneficiary        VARCHAR(200) DEFAULT NULL,
  gsis_relationship       VARCHAR(100) DEFAULT NULL,
  contact_number          VARCHAR(30)  DEFAULT NULL,
  present_address         VARCHAR(255) DEFAULT NULL,
  permanent_address       VARCHAR(255) DEFAULT NULL,

  applicant_category      ENUM('Student','ALS Student','Out of School Youth') DEFAULT NULL,

  -- Father
  father_name             VARCHAR(200) DEFAULT NULL,
  father_contact_no       VARCHAR(30)  DEFAULT NULL,
  father_occupation       VARCHAR(150) DEFAULT NULL,

  -- Mother
  mother_name             VARCHAR(200) DEFAULT NULL,
  mother_contact_no       VARCHAR(30)  DEFAULT NULL,
  mother_occupation       VARCHAR(150) DEFAULT NULL,

  -- Current status of parents (check all that apply)
  parents_living_together TINYINT(1) NOT NULL DEFAULT 0,
  parents_solo_parent     TINYINT(1) NOT NULL DEFAULT 0,
  parents_separated       TINYINT(1) NOT NULL DEFAULT 0,
  parents_pwd             TINYINT(1) NOT NULL DEFAULT 0,
  parents_senior_citizen  TINYINT(1) NOT NULL DEFAULT 0,
  parents_sugar_plantation_worker TINYINT(1) NOT NULL DEFAULT 0,
  parents_indigenous_people TINYINT(1) NOT NULL DEFAULT 0,
  parents_displaced_worker TINYINT(1) NOT NULL DEFAULT 0,
  parents_4ps_beneficiary TINYINT(1) NOT NULL DEFAULT 0,
  parents_local           TINYINT(1) NOT NULL DEFAULT 0,
  parents_ofw             TINYINT(1) NOT NULL DEFAULT 0,

  special_skills          TEXT DEFAULT NULL,
  other_dole_interventions TEXT DEFAULT NULL,   -- Other related information/requests/interventions from DOLE

  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_spes_name (last_name, first_name),
  KEY idx_spes_category (applicant_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Education: one row per level (Elementary, Secondary, Tertiary, Tech-Voc)
CREATE TABLE IF NOT EXISTS spes_education (
  id                      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  applicant_id            INT UNSIGNED NOT NULL,
  level                   ENUM('Elementary','Secondary','Tertiary','Tech-Voc') NOT NULL,
  school_name             VARCHAR(200) DEFAULT NULL,
  course                  VARCHAR(200) DEFAULT NULL,
  year_level              VARCHAR(50)  DEFAULT NULL,
  date_of_attendance      VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_spes_edu_applicant (applicant_id),
  CONSTRAINT fk_spes_edu_applicant
    FOREIGN KEY (applicant_id) REFERENCES spes_applicants (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- History of SPES availment (1st to 4th)
CREATE TABLE IF NOT EXISTS spes_availment_history (
  id                      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  applicant_id            INT UNSIGNED NOT NULL,
  availment_no            TINYINT UNSIGNED NOT NULL,   -- 1st to 4th availment
  establishment_name      VARCHAR(200) DEFAULT NULL,
  year_availed            VARCHAR(10)  DEFAULT NULL,
  spes_id_no              VARCHAR(50)  DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_spes_hist_applicant (applicant_id),
  CONSTRAINT fk_spes_hist_applicant
    FOREIGN KEY (applicant_id) REFERENCES spes_applicants (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;