/* ============================================================
   TRPATU DATABASE SCHEMA (APPLICANTS + BENEFICIARIES)
   ============================================================ */

CREATE DATABASE IF NOT EXISTS lgu_trpatu
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE lgu_trpatu;


/* ============================================================
   1. APPLICANTS
   ============================================================ */

CREATE TABLE IF NOT EXISTS applicants (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    last_name VARCHAR(100) NOT NULL,

    first_name VARCHAR(100) NOT NULL,

    middle_name VARCHAR(100) NULL,

    name_extension VARCHAR(20) NULL,

    birthdate DATE NOT NULL,

    address VARCHAR(255) NOT NULL,

    id_type VARCHAR(50) NULL,

    id_number VARCHAR(50) NULL,

    contact_number VARCHAR(30) NULL,

    occupation VARCHAR(100) NULL,

    sex VARCHAR(20) NOT NULL,

    civil_status VARCHAR(30) NOT NULL,

    average_monthly_income DECIMAL(12,2) NULL,

    remarks TEXT NULL,

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
   2. BENEFICIARIES
   ============================================================

   One applicant can have one or more beneficiaries.
   ============================================================ */

CREATE TABLE IF NOT EXISTS beneficiaries (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    applicant_id INT UNSIGNED NOT NULL,

    beneficiary_type VARCHAR(50) NULL,

    first_name VARCHAR(100) NOT NULL,

    middle_name VARCHAR(100) NULL,

    last_name VARCHAR(100) NOT NULL,

    skills_training_need VARCHAR(150) NULL,

    year_level VARCHAR(30) NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_beneficiaries_applicant (
        applicant_id
    ),

    INDEX idx_beneficiaries_name (
        last_name,
        first_name
    ),

    CONSTRAINT fk_beneficiaries_applicant
        FOREIGN KEY (applicant_id)
        REFERENCES applicants(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);


/* ============================================================
   3. VERIFY THE DATABASE
   ============================================================ */

SHOW TABLES;