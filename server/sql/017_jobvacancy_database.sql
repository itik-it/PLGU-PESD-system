-- JOB VACANCY form (employer + vacancies)
CREATE DATABASE IF NOT EXISTS lgu_jobvacancy
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lgu_jobvacancy;

CREATE TABLE IF NOT EXISTS jobvacancy_employers (
  id                      INT UNSIGNED NOT NULL AUTO_INCREMENT,

  business_name           VARCHAR(200) NOT NULL,
  trade_name              VARCHAR(200) DEFAULT NULL,
  acronym                 VARCHAR(50)  DEFAULT NULL,
  office_type             ENUM('Main Office','Branch') DEFAULT NULL,
  tin                     VARCHAR(30)  DEFAULT NULL,

  employer_type           ENUM(
                            'National Government Agency',
                            'Local Government Unit',
                            'Government-owned and Controlled Corporation',
                            'State/Local University or College',
                            'Direct Hire',
                            'Local Recruitment Agency',
                            'Overseas Recruitment Agency',
                            'D.O. 174'
                          ) DEFAULT NULL,
  employer_sector         ENUM('Public','Private') DEFAULT NULL,

  work_force_size         ENUM('Micro (1-9)','Small (10-99)','Medium (100-199)','Large (200 and up)') DEFAULT NULL,
  line_of_business        VARCHAR(200) DEFAULT NULL,   -- per BIR 2303

  -- Address
  street_village          VARCHAR(150) DEFAULT NULL,
  barangay                VARCHAR(100) DEFAULT NULL,
  municipality_city       VARCHAR(100) DEFAULT NULL,
  province                VARCHAR(100) DEFAULT NULL,

  owner_full_name         VARCHAR(200) DEFAULT NULL,
  contact_person          VARCHAR(200) DEFAULT NULL,
  contact_position        VARCHAR(150) DEFAULT NULL,
  telephone_number        VARCHAR(30)  DEFAULT NULL,
  mobile_number           VARCHAR(30)  DEFAULT NULL,
  fax_number              VARCHAR(30)  DEFAULT NULL,
  email                   VARCHAR(150) DEFAULT NULL,

  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_employer_business (business_name),
  KEY idx_employer_municipality (municipality_city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jobvacancy_vacancies (
  id                      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employer_id             INT UNSIGNED NOT NULL,

  position_title          VARCHAR(200) NOT NULL,
  job_description         TEXT DEFAULT NULL,
  nature_of_work          ENUM(
                            'Permanent',
                            'Contractual',
                            'Project-based',
                            'Internship/OJT',
                            'Part-time',
                            'Work from home / Online job'
                          ) DEFAULT NULL,
  place_of_work           VARCHAR(255) DEFAULT NULL,
  salary                  VARCHAR(100) DEFAULT NULL,
  vacancy_count           SMALLINT UNSIGNED DEFAULT NULL,

  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_vacancy_employer (employer_id),
  CONSTRAINT fk_vacancy_employer
    FOREIGN KEY (employer_id) REFERENCES jobvacancy_employers (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;