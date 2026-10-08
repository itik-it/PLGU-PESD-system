/* ============================================================
   AUTH UPGRADE for lgu_users.users
   Run ONCE (phpMyAdmin / Workbench / mysql CLI).
   ============================================================ */

USE lgu_users;

ALTER TABLE users
    ADD COLUMN role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff'
        AFTER full_name,
    ADD COLUMN last_login_at DATETIME NULL
        AFTER is_active;
