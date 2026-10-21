-- BRIDGING application form
CREATE DATABASE IF NOT EXISTS lgu_bridging
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lgu_bridging;

CREATE TABLE IF NOT EXISTS bridging_applicants (
  id                      INT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- Name
  family_name             VARCHAR(100) NOT NULL,
  first_name              VARCHAR(100) NOT NULL,
  middle_name             VARCHAR(100) DEFAULT NULL,

  -- Resident address
  street                  VARCHAR(150) DEFAULT NULL,
  barangay                VARCHAR(100) DEFAULT NULL,
  municipality            VARCHAR(100) DEFAULT NULL,
  province                VARCHAR(100) DEFAULT NULL,

  -- Contact
  mobile_no               VARCHAR(30)  DEFAULT NULL,
  email                   VARCHAR(150) DEFAULT NULL,

  -- Place and date of birth
  birth_town              VARCHAR(100) DEFAULT NULL,
  birth_country           VARCHAR(100) DEFAULT NULL,
  birthdate               DATE DEFAULT NULL,
  age                     TINYINT UNSIGNED DEFAULT NULL,

  gender                  ENUM('Male','Female') DEFAULT NULL,
  civil_status            ENUM('Single','Married','Widow/Widower') DEFAULT NULL,

  -- Parents
  mother_full_name        VARCHAR(200) DEFAULT NULL,
  father_full_name        VARCHAR(200) DEFAULT NULL,

  current_status          ENUM('Student','Out of School Youth (OSY)') DEFAULT NULL,

  -- SPES baby
  is_spes_baby            TINYINT(1) NOT NULL DEFAULT 0,
  spes_year_of_employment VARCHAR(20) DEFAULT NULL,

  gwa                     DECIMAL(5,2) DEFAULT NULL,

  -- Status of parent (check all that apply)
  parent_solo_parent      TINYINT(1) NOT NULL DEFAULT 0,
  parent_pwd              TINYINT(1) NOT NULL DEFAULT 0,
  parent_senior_citizen   TINYINT(1) NOT NULL DEFAULT 0,
  parent_ip               TINYINT(1) NOT NULL DEFAULT 0,
  parent_armed_conflict_victim TINYINT(1) NOT NULL DEFAULT 0,
  parent_rebel_returnee   TINYINT(1) NOT NULL DEFAULT 0,

  parents_combined_monthly_income VARCHAR(100) DEFAULT NULL,
  number_of_siblings      TINYINT UNSIGNED DEFAULT NULL,
  is_indigent_family      TINYINT(1) NOT NULL DEFAULT 0,

  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_bridging_name (family_name, first_name),
  KEY idx_bridging_barangay (barangay)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Educational attainment: add as many rows per applicant as needed
CREATE TABLE IF NOT EXISTS bridging_education (
  id                      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  applicant_id            INT UNSIGNED NOT NULL,
  school_name             VARCHAR(200) NOT NULL,
  year_from               VARCHAR(10)  DEFAULT NULL,
  year_to                 VARCHAR(10)  DEFAULT NULL,
  year_level              ENUM(
                            'College Graduate',
                            'College Level',
                            'Vocational Graduate',
                            'Senior High School/High School Graduate'
                          ) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_bridging_edu_applicant (applicant_id),
  CONSTRAINT fk_bridging_edu_applicant
    FOREIGN KEY (applicant_id) REFERENCES bridging_applicants (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;