/* ============================================================
   DILP DATABASE SCHEMA
   LGU/PESO Dilp Program
   ============================================================ */

CREATE DATABASE IF NOT EXISTS lgu_dilp
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE lgu_dilp;


/* ============================================================
   1. APPLICANTS
   ============================================================ */

CREATE TABLE IF NOT EXISTS applicants (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    /* Application */

    date_applied DATE NOT NULL,

    /* Project */

    project_name VARCHAR(255) NOT NULL,

    project_location VARCHAR(255) NULL,

    /* Individual or Group */

    project_type VARCHAR(20) NOT NULL,

    /* Formation, Restoration or Enhancement */

    project_component VARCHAR(30) NOT NULL,

    /* ACP or Direct Admin */

    implementation_mode VARCHAR(30) NOT NULL,

    /* Applicant */

    last_name VARCHAR(100) NOT NULL,

    first_name VARCHAR(100) NOT NULL,

    middle_name VARCHAR(100) NULL,

    name_extension VARCHAR(20) NULL,

    /* Complete address */

    house_block_lot VARCHAR(100) NULL,

    street VARCHAR(100) NULL,

    barangay VARCHAR(100) NOT NULL,

    municipality VARCHAR(100) NOT NULL,

    province VARCHAR(100) NULL,

    sex VARCHAR(20) NOT NULL,

    /* Single, Married, Widowed, Separated or Others */

    civil_status VARCHAR(30) NULL,

    civil_status_other VARCHAR(100) NULL,

    birthdate DATE NOT NULL,

    birthplace VARCHAR(255) NULL,

    /* Comma-separated: None, Hearing, Speech, Visual, Physical, Others */

    disability VARCHAR(255) NULL,

    disability_other VARCHAR(100) NULL,

    contact_number VARCHAR(30) NULL,

    beneficiary_type VARCHAR(100) NULL,

    /* Overseas work */

    /* Currently OFW, Former OFW or Did not work abroad */

    overseas_work VARCHAR(30) NULL,

    /* TESDA */

    /* Yes or No */

    tesda_graduate VARCHAR(10) NULL,

    tesda_certificate VARCHAR(255) NULL,

    /* Household */

    monthly_net_income DECIMAL(12,2) NULL,

    children_count TINYINT UNSIGNED NULL,

    /* 4Ps (Yes or No) */

    is_4ps_beneficiary VARCHAR(10) NULL,

    beneficiary_name VARCHAR(200) NULL,

    beneficiary_contact_number VARCHAR(30) NULL,

    is_4ps_graduate VARCHAR(10) NULL,

    /* Requirements */

    id_type VARCHAR(100) NULL,

    id_number VARCHAR(100) NULL,

    /* Yes or No */

    has_cert_indigency VARCHAR(10) NULL,

    /* Social media */

    facebook VARCHAR(150) NULL,

    instagram VARCHAR(150) NULL,

    email VARCHAR(150) NULL,

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

    INDEX idx_applicants_address (
        municipality,
        barangay
    ),

    INDEX idx_applicants_date_applied (
        date_applied
    ),

    INDEX idx_applicants_project_name (
        project_name
    )
);


/* ============================================================
   2. VERIFY THE DATABASE
   ============================================================ */

SHOW TABLES;