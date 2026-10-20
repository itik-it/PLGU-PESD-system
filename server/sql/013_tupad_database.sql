/* ============================================================
   TUPAD DATABASE SCHEMA
   LGU/PESO Tupad Program
   ============================================================ */

CREATE DATABASE IF NOT EXISTS lgu_tupad
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE lgu_tupad;


/* ============================================================
   1. APPLICANTS
   ============================================================ */

CREATE TABLE IF NOT EXISTS applicants (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    /* Applicant */

    last_name VARCHAR(100) NOT NULL,

    first_name VARCHAR(100) NOT NULL,

    middle_name VARCHAR(100) NULL,

    name_extension VARCHAR(20) NULL,

    birthdate DATE NOT NULL,

    address VARCHAR(255) NOT NULL,

    /* Identification */

    id_type VARCHAR(100) NULL,

    id_number VARCHAR(100) NULL,

    contact_number VARCHAR(30) NULL,

    occupation VARCHAR(150) NULL,

    sex VARCHAR(20) NOT NULL,

    /* Single, Married, Widowed or Separated */

    civil_status VARCHAR(30) NOT NULL,

    average_monthly_income DECIMAL(12,2) NULL,

    /* Beneficiary */

    /* Father, Mother, Son or Daughter */

    beneficiary_type VARCHAR(20) NOT NULL,

    beneficiary_last_name VARCHAR(100) NOT NULL,

    beneficiary_first_name VARCHAR(100) NOT NULL,

    beneficiary_middle_name VARCHAR(100) NULL,

    skills_training_need VARCHAR(255) NULL,

    year_level VARCHAR(50) NULL,

    /* Qualified or Disqualified */

    remarks VARCHAR(30) NULL,

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
    ),

    INDEX idx_applicants_beneficiary_name (
        beneficiary_last_name,
        beneficiary_first_name
    ),

    INDEX idx_applicants_remarks (
        remarks
    )
);


/* ============================================================
   2. VERIFY THE DATABASE
   ============================================================ */

SHOW TABLES;