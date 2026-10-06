/* ============================================================
   LGU/PESO SYSTEM DATABASE SCHEMA
   ============================================================ */

/* ============================================================
   1. CENTRAL USER DATABASE
   ============================================================ */

CREATE DATABASE IF NOT EXISTS lgu_users
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE lgu_users;


/* ============================================================
   USERS
   One account for the whole LGU/PESO system
   ============================================================ */

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    username VARCHAR(50) NOT NULL,

    password_hash VARCHAR(255) NOT NULL,

    full_name VARCHAR(150) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_users_username (username)
);


/* ============================================================
   2. GIP DATABASE
   ============================================================ */

CREATE DATABASE IF NOT EXISTS lgu_gip
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE lgu_gip;


/* ============================================================
   3. CLASSIFICATIONS
   ============================================================

   An applicant can have MULTIPLE classifications.

   Example:

   ☑ Fresh Graduate
   ☑ First Time Job Seeker
   ☐ Young Professional
   ============================================================ */

CREATE TABLE IF NOT EXISTS classifications (
    id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,

    classification_name VARCHAR(100) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_classification_name (classification_name)
);


/* Default classifications */

INSERT IGNORE INTO classifications
    (classification_name)
VALUES
    ('Fresh Graduate'),
    ('First Time Job Seeker'),
    ('Young Professional');


/* ============================================================
   4. APPLICANTS
   ============================================================ */

CREATE TABLE IF NOT EXISTS applicants (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    last_name VARCHAR(100) NOT NULL,

    first_name VARCHAR(100) NOT NULL,

    middle_name VARCHAR(100) NULL,

    name_extension VARCHAR(20) NULL,

    birthdate DATE NOT NULL,

    age TINYINT UNSIGNED NULL,

    sex VARCHAR(20) NOT NULL,

    civil_status VARCHAR(30) NOT NULL,

    address VARCHAR(255) NULL,

    barangay VARCHAR(100) NOT NULL,

    municipality VARCHAR(100) NOT NULL,

    province VARCHAR(100) NOT NULL,

    course VARCHAR(150) NULL,

    email VARCHAR(150) NULL,

    contact_number VARCHAR(30) NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_applicants_name (
        last_name,
        first_name
    ),

    INDEX idx_applicants_contact (
        contact_number
    )
);


/* ============================================================
   5. APPLICANT CLASSIFICATIONS
   ============================================================

   Junction table.

   This allows one applicant to have multiple
   classifications.
   ============================================================ */

CREATE TABLE IF NOT EXISTS applicant_classifications (
    applicant_id INT UNSIGNED NOT NULL,

    classification_id TINYINT UNSIGNED NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (
        applicant_id,
        classification_id
    ),

    CONSTRAINT fk_applicant_classifications_applicant
        FOREIGN KEY (applicant_id)
        REFERENCES applicants(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_applicant_classifications_classification
        FOREIGN KEY (classification_id)
        REFERENCES classifications(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);


/* ============================================================
   6. APPLICATIONS
   ============================================================ */

CREATE TABLE IF NOT EXISTS applications (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    applicant_id INT UNSIGNED NOT NULL,

    date_applied DATE NULL,

    remarks TEXT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_applications_applicant (
        applicant_id
    ),

    INDEX idx_applications_date (
        date_applied
    ),

    CONSTRAINT fk_applications_applicant
        FOREIGN KEY (applicant_id)
        REFERENCES applicants(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);


/* ============================================================
   7. REQUIREMENT TYPES
   ============================================================

   These are the checkbox requirements.

   Supporting Documents is NOT included here because
   it is a text field.
   ============================================================ */

CREATE TABLE IF NOT EXISTS requirement_types (
    id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,

    requirement_name VARCHAR(150) NOT NULL,

    is_required BOOLEAN NOT NULL DEFAULT TRUE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_requirement_name (requirement_name)
);


/* Default GIP requirements */

INSERT IGNORE INTO requirement_types
    (requirement_name, is_required)
VALUES
    ('GIP/IP Form', TRUE),
    ('Resume', TRUE),
    ('Valid ID', TRUE),
    ('PSA', TRUE),
    ('Diploma', TRUE),
    ('TOR', TRUE);


/* ============================================================
   8. APPLICATION REQUIREMENTS
   ============================================================

   Stores the checkbox state for each requirement.

   Checked:
       Submitted

   Unchecked:
       Pending
   ============================================================ */

CREATE TABLE IF NOT EXISTS application_requirements (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    application_id INT UNSIGNED NOT NULL,

    requirement_type_id TINYINT UNSIGNED NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'Pending',

    file_name VARCHAR(255) NULL,

    file_path VARCHAR(500) NULL,

    remarks TEXT NULL,

    submitted_at DATETIME NULL,

    verified_at DATETIME NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_application_requirement (
        application_id,
        requirement_type_id
    ),

    CONSTRAINT fk_application_requirements_application
        FOREIGN KEY (application_id)
        REFERENCES applications(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_application_requirements_type
        FOREIGN KEY (requirement_type_id)
        REFERENCES requirement_types(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);


/* ============================================================
   9. SUPPORTING DOCUMENTS
   ============================================================

   Supporting Documents is a TEXT FIELD.

   Example:
   "Barangay Certificate, Certificate of Eligibility"
   ============================================================ */

CREATE TABLE IF NOT EXISTS application_supporting_documents (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    application_id INT UNSIGNED NOT NULL,

    document_description TEXT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_supporting_documents_application (
        application_id
    ),

    CONSTRAINT fk_supporting_documents_application
        FOREIGN KEY (application_id)
        REFERENCES applications(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);


/* ============================================================
   10. VERIFY THE DATABASE
   ============================================================ */

USE lgu_users;

SHOW TABLES;

USE lgu_gip;

SHOW TABLES;