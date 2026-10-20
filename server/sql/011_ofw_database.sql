/* ============================================================
   OFW DATABASE SCHEMA
   LGU/PESO Overseas Filipino Workers Program
   ============================================================ */

CREATE DATABASE IF NOT EXISTS lgu_ofw
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE lgu_ofw;


/* ============================================================
   1. APPLICANTS
   ============================================================ */

CREATE TABLE IF NOT EXISTS applicants (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    /* OFW status */

    /* For Good na OFW, or Naka-bakasyon / Kasalukuyang nagtatrabaho abroad / May balak pang mag-abroad */

    ofw_status VARCHAR(100) NOT NULL,

    /* Applicant */

    last_name VARCHAR(100) NOT NULL,

    first_name VARCHAR(100) NOT NULL,

    name_extension VARCHAR(20) NULL,

    middle_name VARCHAR(100) NULL,

    /* Permanent address in the Philippines */

    barangay VARCHAR(100) NOT NULL,

    municipality VARCHAR(100) NOT NULL,

    /* Passport / Travel Document / Certificate of Identity number */

    passport_number VARCHAR(50) NULL,

    /* Yes or No */

    owwa_member VARCHAR(10) NULL,

    birthdate DATE NULL,

    age TINYINT UNSIGNED NULL,

    sex VARCHAR(20) NULL,

    ethnicity VARCHAR(100) NULL,

    religion VARCHAR(100) NULL,

    /* Single, Married, Widowed or Separated */

    civil_status VARCHAR(30) NULL,

    children_count TINYINT UNSIGNED NULL,

    educational_attainment VARCHAR(150) NULL,

    /* Contact */

    cellphone_number VARCHAR(30) NULL,

    email VARCHAR(150) NULL,

    facebook VARCHAR(150) NULL,

    /* Work abroad */

    /* Land-based or Sea-based */

    work_nature VARCHAR(20) NULL,

    occupation VARCHAR(150) NULL,

    monthly_income DECIMAL(12,2) NULL,

    /* Country of work or flag vessel */

    country_of_work VARCHAR(150) NULL,

    employer_name VARCHAR(200) NULL,

    employer_address VARCHAR(255) NULL,

    /* Recruitment agencies */

    foreign_agency_name VARCHAR(200) NULL,

    foreign_agency_address VARCHAR(255) NULL,

    /* Recruitment / manning agency in the Philippines */

    local_agency VARCHAR(200) NULL,

    /* Clientele and health */

    /* Comma-separated: PWD, 4Ps Member, Pregnant, Solo Parent, Elderly, FHONA (Family Head), Not Applicable */

    clientele_category VARCHAR(255) NULL,

    preexisting_health_condition VARCHAR(255) NULL,

    /* Emergency contact */

    emergency_contact_name VARCHAR(200) NULL,

    emergency_contact_number VARCHAR(30) NULL,

    /* Parent, Spouse, Child, Sibling or Others */

    emergency_relationship VARCHAR(30) NULL,

    emergency_relationship_other VARCHAR(100) NULL,

    /* Employment and repatriation */

    /* Laid Off, Temporary Displaced, Currently Employed Overseas, End of Contract or On Vacation */

    employment_status VARCHAR(50) NULL,

    years_abroad TINYINT UNSIGNED NULL,

    /* Date of arrival in the Philippines */

    arrival_date DATE NULL,

    /* Philippine Government, Recruitment Agency, Own Expenses, Employer or Not Applicable */

    repatriation_nature VARCHAR(50) NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_applicants_name (
        last_name,
        first_name
    ),

    INDEX idx_applicants_contact (
        cellphone_number
    ),

    INDEX idx_applicants_address (
        municipality,
        barangay
    ),

    INDEX idx_applicants_arrival_date (
        arrival_date
    )
);


/* ============================================================
   2. VERIFY THE DATABASE
   ============================================================ */

SHOW TABLES;