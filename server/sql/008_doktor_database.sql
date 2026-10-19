/* ============================================================
   DOKTOR TI UMILI DATABASE SCHEMA
   Nueva Vizcaya "Doktor ti Umili" Scholarship Program
   ============================================================ */

CREATE DATABASE IF NOT EXISTS lgu_doktor
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE lgu_doktor;


/* ============================================================
   1. APPLICANTS
   ============================================================ */

CREATE TABLE IF NOT EXISTS applicants (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    /* Application */

    date_applied DATE NOT NULL,

    /* Applicant */

    last_name VARCHAR(100) NOT NULL,

    first_name VARCHAR(100) NOT NULL,

    middle_name VARCHAR(100) NULL,

    name_extension VARCHAR(20) NULL,

    contact_number VARCHAR(30) NULL,

    sex VARCHAR(20) NOT NULL,

    birthdate DATE NOT NULL,

    address VARCHAR(255) NOT NULL,

    age TINYINT UNSIGNED NULL,

    civil_status VARCHAR(30) NULL,

    years_of_residency TINYINT UNSIGNED NULL,

    /* Pre-med and examinations */

    premed_course VARCHAR(150) NULL,

    med_entrance_exam_result VARCHAR(50) NULL,

    med_entrance_exam_date DATE NULL,

    nmat_result VARCHAR(50) NULL,

    nmat_exam_date DATE NULL,

    /* School */

    school_last_attended VARCHAR(200) NULL,

    gwa DECIMAL(5,2) NULL,

    awards TEXT NULL,

    /* GWA per year level */

    gwa_first_year DECIMAL(5,2) NULL,

    gwa_second_year DECIMAL(5,2) NULL,

    gwa_third_year DECIMAL(5,2) NULL,

    gwa_fourth_year DECIMAL(5,2) NULL,

    gwa_internship DECIMAL(5,2) NULL,

    gwa_review_for_board DECIMAL(5,2) NULL,

    /* Program status */

    /* Batch 1 to Batch 4 */

    batch VARCHAR(20) NULL,

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

    INDEX idx_applicants_date_applied (
        date_applied
    ),

    INDEX idx_applicants_batch (
        batch
    )
);


/* ============================================================
   2. VERIFY THE DATABASE
   ============================================================ */

SHOW TABLES;