/* ============================================================
   GUWIP DATABASE SCHEMA
   Gayyem Ti Umili Work Internship Program
   ============================================================ */

CREATE DATABASE IF NOT EXISTS lgu_guwip
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE lgu_guwip;


/* ============================================================
   1. EMPLOYMENT STATUSES (CURRENT EMPLOYMENT STATUS)
   ============================================================

   An applicant can have MULTIPLE current employment statuses.

   Example:

   ☑ Fresh Graduate
   ☑ First Time Jobseeker
   ☐ Unemployed
   ============================================================ */

CREATE TABLE IF NOT EXISTS employment_statuses (
    id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,

    status_name VARCHAR(100) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_employment_status_name (status_name)
);


/* Default employment statuses */

INSERT IGNORE INTO employment_statuses
    (status_name)
VALUES
    ('Fresh Graduate'),
    ('Young Professional'),
    ('First Time Jobseeker'),
    ('Unemployed'),
    ('Underemployed');


/* ============================================================
   2. APPLICANTS
   ============================================================ */

CREATE TABLE IF NOT EXISTS applicants (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    /* I. PERSONAL INFORMATION */

    last_name VARCHAR(100) NOT NULL,

    first_name VARCHAR(100) NOT NULL,

    middle_name VARCHAR(100) NULL,

    name_extension VARCHAR(20) NULL,

    birthdate DATE NOT NULL,

    age TINYINT UNSIGNED NULL,

    sex VARCHAR(20) NOT NULL,

    civil_status VARCHAR(30) NULL,

    /* Address */

    street VARCHAR(150) NULL,

    barangay VARCHAR(100) NOT NULL,

    municipality VARCHAR(100) NOT NULL,

    province VARCHAR(100) NOT NULL DEFAULT 'Nueva Vizcaya',

    zip_code VARCHAR(10) NULL,

    /* Contact information */

    mobile_number VARCHAR(30) NULL,

    email VARCHAR(150) NULL,

    emergency_contact_person VARCHAR(150) NULL,

    emergency_relationship VARCHAR(50) NULL,

    emergency_contact_number VARCHAR(30) NULL,

    /* II. EDUCATIONAL BACKGROUND */

    /* Senior High School Graduate, College Graduate,
       Post-graduate, Technical-Vocational Graduate */

    highest_education VARCHAR(50) NULL,

    school_name VARCHAR(200) NULL,

    course VARCHAR(150) NULL,

    major VARCHAR(150) NULL,

    year_graduated SMALLINT UNSIGNED NULL,

    professional_license VARCHAR(200) NULL,

    /* III. EMPLOYMENT INFORMATION */

    /* Only filled in if underemployed */

    employer VARCHAR(150) NULL,

    position VARCHAR(100) NULL,

    /* Permanent, Temporary, Contractual, Part-time */

    employment_type VARCHAR(30) NULL,

    monthly_income DECIMAL(12,2) NULL,

    /* Employed / Unemployed */

    remarks VARCHAR(50) NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_applicants_name (
        last_name,
        first_name
    ),

    INDEX idx_applicants_mobile (
        mobile_number
    ),

    INDEX idx_applicants_address (
        municipality,
        barangay
    )
);


/* ============================================================
   3. APPLICANT EMPLOYMENT STATUSES
   ============================================================

   Junction table.

   This allows one applicant to have multiple
   current employment statuses.
   ============================================================ */

CREATE TABLE IF NOT EXISTS applicant_employment_statuses (
    applicant_id INT UNSIGNED NOT NULL,

    employment_status_id TINYINT UNSIGNED NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (
        applicant_id,
        employment_status_id
    ),

    CONSTRAINT fk_applicant_employment_statuses_applicant
        FOREIGN KEY (applicant_id)
        REFERENCES applicants(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_applicant_employment_statuses_status
        FOREIGN KEY (employment_status_id)
        REFERENCES employment_statuses(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);


/* ============================================================
   4. APPLICANT TRAININGS
   ============================================================

   Relevant Training/Certifications table.

   One applicant can have many trainings.

   date_conducted is text so it can hold a range,
   for example "March 3-5, 2024".
   ============================================================ */

CREATE TABLE IF NOT EXISTS applicant_trainings (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    applicant_id INT UNSIGNED NOT NULL,

    training_title VARCHAR(200) NOT NULL,

    number_of_hours DECIMAL(6,2) NULL,

    date_conducted VARCHAR(100) NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_applicant_trainings_applicant (
        applicant_id
    ),

    CONSTRAINT fk_applicant_trainings_applicant
        FOREIGN KEY (applicant_id)
        REFERENCES applicants(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);


/* ============================================================
   5. VERIFY THE DATABASE
   ============================================================ */

SHOW TABLES;