-- JOBSEEKER registration form
CREATE DATABASE IF NOT EXISTS lgu_jobseeker
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lgu_jobseeker;

CREATE TABLE IF NOT EXISTS applicants (
  id                      INT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- Name
  surname                 VARCHAR(100) NOT NULL,
  first_name              VARCHAR(100) NOT NULL,
  middle_name             VARCHAR(100) DEFAULT NULL,
  suffix                  VARCHAR(20)  DEFAULT NULL,

  -- Personal
  birthdate               DATE DEFAULT NULL,
  sex                     ENUM('Male','Female') DEFAULT NULL,
  place_of_birth          VARCHAR(255) DEFAULT NULL,
  religion                VARCHAR(100) DEFAULT NULL,
  civil_status            ENUM('Single','Married','Widowed','Separated','Live-in') DEFAULT NULL,
  height                  VARCHAR(20)  DEFAULT NULL,

  -- Address
  house_no_street         VARCHAR(150) DEFAULT NULL,
  village                 VARCHAR(100) DEFAULT NULL,
  barangay                VARCHAR(100) DEFAULT NULL,
  municipality_city       VARCHAR(100) DEFAULT NULL,
  province                VARCHAR(100) DEFAULT NULL,

  -- Government IDs
  tin                     VARCHAR(30)  DEFAULT NULL,
  gsis_sss_id_no          VARCHAR(30)  DEFAULT NULL,
  pagibig_no              VARCHAR(30)  DEFAULT NULL,
  philhealth_no           VARCHAR(30)  DEFAULT NULL,

  -- Contact
  email                   VARCHAR(150) DEFAULT NULL,
  landline_number         VARCHAR(30)  DEFAULT NULL,
  cellphone_number        VARCHAR(30)  DEFAULT NULL,

  -- Disability (check all that apply)
  disability_visual       TINYINT(1) NOT NULL DEFAULT 0,
  disability_speech       TINYINT(1) NOT NULL DEFAULT 0,
  disability_hearing      TINYINT(1) NOT NULL DEFAULT 0,
  disability_physical     TINYINT(1) NOT NULL DEFAULT 0,
  disability_others       TINYINT(1) NOT NULL DEFAULT 0,
  disability_others_specify VARCHAR(150) DEFAULT NULL,

  -- Employment status
  -- Employed: Wage Employed, Self Employed
  -- Unemployed: New Entrant/Fresh Graduate, Finished Contract, Resigned,
  --             Retired, Terminated/Laid-off (Local), Terminated/Laid-off (Abroad), Others
  employment_status       ENUM(
                            'Wage Employed',
                            'Self Employed',
                            'New Entrant/Fresh Graduate',
                            'Finished Contract',
                            'Resigned',
                            'Retired',
                            'Terminated/Laid-off (Local)',
                            'Terminated/Laid-off (Abroad)',
                            'Others'
                          ) DEFAULT NULL,
  laidoff_abroad_country  VARCHAR(100) DEFAULT NULL,
  employment_others_specify VARCHAR(150) DEFAULT NULL,

  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_jobseeker_name (surname, first_name),
  KEY idx_jobseeker_barangay (barangay),
  KEY idx_jobseeker_employment (employment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;