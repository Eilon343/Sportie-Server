-- Complete database schema for Sportie.
-- This file merges the original base schema (db_init.sql) with all migrations
-- (001–008) so a fresh database can be initialised in a single pass.
-- Every CREATE TABLE uses IF NOT EXISTS — safe to re-run on an existing database.

CREATE DATABASE IF NOT EXISTS sportieDb;
USE sportieDb;

-- ──────────────────────────────────────────────────────────────────────────────
-- CORE USER & TRAINER TABLES
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    user_id    INT AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    role       ENUM('trainer', 'trainee') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- specialization is nullable (migration 008: trainers are created at sign-up
-- with only trainer_id + name; profile fields are filled in via Settings later).
CREATE TABLE IF NOT EXISTS trainers (
    trainer_id     INT PRIMARY KEY,
    name           VARCHAR(255) NOT NULL,
    specialization VARCHAR(255),
    avatar_color   VARCHAR(50),
    avatar_url     LONGTEXT,
    date_of_birth  DATE,
    country_code   VARCHAR(10),
    phone_number   VARCHAR(30),
    units          VARCHAR(20),
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (trainer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trainer_monthly_activity (
    activity_id  INT AUTO_INCREMENT PRIMARY KEY,
    trainer_id   INT,
    month_index  INT,
    trainee_count INT,
    FOREIGN KEY (trainer_id) REFERENCES trainers(trainer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trainees (
    trainee_id    INT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    goal          VARCHAR(100),
    progress      INT DEFAULT 0,
    last_activity VARCHAR(255),
    avatar_color  VARCHAR(50),
    avatar_url    LONGTEXT,
    trainer_id    INT,
    FOREIGN KEY (trainer_id)  REFERENCES trainers(trainer_id),
    FOREIGN KEY (trainee_id)  REFERENCES users(user_id) ON DELETE CASCADE
);

-- ──────────────────────────────────────────────────────────────────────────────
-- EXERCISE CATALOGUE
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exercises (
    exercise_id VARCHAR(50) PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    body_part   VARCHAR(100) NOT NULL,
    target      VARCHAR(100) NOT NULL,
    equipment   VARCHAR(100) NOT NULL,
    gif_url     VARCHAR(255) NOT NULL,
    difficulty  VARCHAR(50)
);

-- ──────────────────────────────────────────────────────────────────────────────
-- TRAINING PLANS
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS training_plans (
    plan_id      INT AUTO_INCREMENT PRIMARY KEY,
    trainee_id   INT,
    name         VARCHAR(255),
    goal         VARCHAR(100),
    days_per_week INT,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trainee_id) REFERENCES trainees(trainee_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plan_exercises (
    plan_exercise_id    INT AUTO_INCREMENT PRIMARY KEY,
    plan_id             INT,
    exercise_id         VARCHAR(50) NULL,
    custom_exercise_name VARCHAR(255) NULL,
    day_index           INT,
    sets                INT,
    reps                INT,
    rest_seconds        INT,
    is_active           BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (plan_id)      REFERENCES training_plans(plan_id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id)  REFERENCES exercises(exercise_id) ON DELETE CASCADE
);

-- ──────────────────────────────────────────────────────────────────────────────
-- ANALYTICS TABLES  (migration 001)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workout_sessions (
    session_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
    trainee_id     INT NOT NULL,
    plan_id        INT NULL,
    scheduled_date DATE NULL,
    performed_at   DATETIME NULL,
    status         ENUM('scheduled','completed','missed','cancelled') NOT NULL DEFAULT 'scheduled',
    notes          VARCHAR(500) NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ws_trainee FOREIGN KEY (trainee_id) REFERENCES trainees(trainee_id) ON DELETE CASCADE,
    CONSTRAINT fk_ws_plan    FOREIGN KEY (plan_id)    REFERENCES training_plans(plan_id) ON DELETE SET NULL,
    INDEX idx_ws_trainee_performed (trainee_id, performed_at),
    INDEX idx_ws_trainee_status    (trainee_id, status),
    INDEX idx_ws_performed         (performed_at)
);

CREATE TABLE IF NOT EXISTS logged_sets (
    logged_set_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id       BIGINT NOT NULL,
    exercise_id      VARCHAR(50) NULL,
    plan_exercise_id INT NULL,
    set_number       INT NOT NULL,
    reps             INT NOT NULL,
    weight           DECIMAL(6,2) NOT NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ls_session       FOREIGN KEY (session_id)       REFERENCES workout_sessions(session_id) ON DELETE CASCADE,
    CONSTRAINT fk_ls_exercise      FOREIGN KEY (exercise_id)      REFERENCES exercises(exercise_id) ON DELETE SET NULL,
    CONSTRAINT fk_ls_plan_exercise FOREIGN KEY (plan_exercise_id) REFERENCES plan_exercises(plan_exercise_id) ON DELETE SET NULL,
    INDEX idx_ls_session  (session_id),
    INDEX idx_ls_exercise (exercise_id)
);

CREATE TABLE IF NOT EXISTS trainee_metrics (
    metric_id   BIGINT AUTO_INCREMENT PRIMARY KEY,
    trainee_id  INT NOT NULL,
    metric_type ENUM('body_weight','body_fat_pct','muscle_mass') NOT NULL,
    value       DECIMAL(7,2) NOT NULL,
    measured_at DATE NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tm_trainee FOREIGN KEY (trainee_id) REFERENCES trainees(trainee_id) ON DELETE CASCADE,
    UNIQUE KEY uq_tm_trainee_type_date (trainee_id, metric_type, measured_at)
);

-- ──────────────────────────────────────────────────────────────────────────────
-- WORKOUT TEMPLATES  (migration 002)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workout_templates (
    template_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    trainer_id  INT NOT NULL,
    name        VARCHAR(255) NOT NULL,
    mode        ENUM('day-specific','abstract') NOT NULL DEFAULT 'day-specific',
    goal        VARCHAR(100) NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wt_trainer FOREIGN KEY (trainer_id) REFERENCES trainers(trainer_id) ON DELETE CASCADE,
    INDEX idx_wt_trainer (trainer_id)
);

CREATE TABLE IF NOT EXISTS workout_template_blocks (
    block_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
    template_id BIGINT NOT NULL,
    block_index INT NOT NULL,
    label       VARCHAR(100) NULL,
    block_type  ENUM('workout','cardio','rest') NOT NULL DEFAULT 'workout',
    notes       VARCHAR(500) NULL,
    CONSTRAINT fk_wtb_template FOREIGN KEY (template_id) REFERENCES workout_templates(template_id) ON DELETE CASCADE,
    INDEX idx_wtb_template (template_id)
);

CREATE TABLE IF NOT EXISTS workout_template_exercises (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    block_id             BIGINT NOT NULL,
    exercise_id          VARCHAR(50) NULL,
    custom_exercise_name VARCHAR(255) NULL,
    sets                 INT NULL,
    reps                 INT NULL,
    rest_seconds         INT NULL,
    CONSTRAINT fk_wte_block    FOREIGN KEY (block_id)    REFERENCES workout_template_blocks(block_id) ON DELETE CASCADE,
    CONSTRAINT fk_wte_exercise FOREIGN KEY (exercise_id) REFERENCES exercises(exercise_id) ON DELETE SET NULL,
    INDEX idx_wte_block (block_id)
);

-- ──────────────────────────────────────────────────────────────────────────────
-- MEAL TEMPLATES  (migrations 002, 003, 007)
-- ──────────────────────────────────────────────────────────────────────────────

-- Macro totals (migration 007) are baked in from the start.
CREATE TABLE IF NOT EXISTS meal_templates (
    template_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
    trainer_id     INT NOT NULL,
    name           VARCHAR(255) NOT NULL,
    total_calories DECIMAL(8,2) NOT NULL DEFAULT 0,
    total_protein  DECIMAL(7,2) NOT NULL DEFAULT 0,
    total_carbs    DECIMAL(7,2) NOT NULL DEFAULT 0,
    total_fat      DECIMAL(7,2) NOT NULL DEFAULT 0,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mt_trainer FOREIGN KEY (trainer_id) REFERENCES trainers(trainer_id) ON DELETE CASCADE,
    INDEX idx_mt_trainer (trainer_id)
);

CREATE TABLE IF NOT EXISTS meal_template_slots (
    slot_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
    template_id BIGINT NOT NULL,
    slot_index  INT NOT NULL,
    slot_label  VARCHAR(100) NULL,
    CONSTRAINT fk_mts_template FOREIGN KEY (template_id) REFERENCES meal_templates(template_id) ON DELETE CASCADE,
    INDEX idx_mts_template (template_id)
);

-- Per-100g macro columns (migration 003) are baked in from the start.
CREATE TABLE IF NOT EXISTS meal_slot_options (
    option_id        BIGINT AUTO_INCREMENT PRIMARY KEY,
    slot_id          BIGINT NOT NULL,
    mealdb_id        VARCHAR(50) NULL,
    meal_name        VARCHAR(255) NOT NULL,
    meal_thumb       VARCHAR(500) NULL,
    notes            VARCHAR(500) NULL,
    quantity         DECIMAL(7,2) NULL,
    unit             VARCHAR(20) NULL,
    calories_per_100 DECIMAL(7,2) NULL,
    protein_per_100  DECIMAL(6,2) NULL,
    carbs_per_100    DECIMAL(6,2) NULL,
    fat_per_100      DECIMAL(6,2) NULL,
    sugar_per_100    DECIMAL(6,2) NULL,
    fiber_per_100    DECIMAL(6,2) NULL,
    CONSTRAINT fk_mso_slot FOREIGN KEY (slot_id) REFERENCES meal_template_slots(slot_id) ON DELETE CASCADE,
    INDEX idx_mso_slot (slot_id)
);

-- ──────────────────────────────────────────────────────────────────────────────
-- MEAL PLANS  (migrations 004, 006, 007)
-- ──────────────────────────────────────────────────────────────────────────────

-- is_active (migration 006) and macro totals (migration 007) are baked in.
CREATE TABLE IF NOT EXISTS meal_plans (
    meal_plan_id       BIGINT AUTO_INCREMENT PRIMARY KEY,
    trainee_id         INT NOT NULL,
    name               VARCHAR(255) NOT NULL,
    source_template_id BIGINT NULL,
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    total_calories     DECIMAL(8,2) NOT NULL DEFAULT 0,
    total_protein      DECIMAL(7,2) NOT NULL DEFAULT 0,
    total_carbs        DECIMAL(7,2) NOT NULL DEFAULT 0,
    total_fat          DECIMAL(7,2) NOT NULL DEFAULT 0,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mp_trainee FOREIGN KEY (trainee_id) REFERENCES trainees(trainee_id) ON DELETE CASCADE,
    INDEX idx_mp_trainee (trainee_id)
);

CREATE TABLE IF NOT EXISTS meal_plan_slots (
    slot_id      BIGINT AUTO_INCREMENT PRIMARY KEY,
    meal_plan_id BIGINT NOT NULL,
    slot_index   INT NOT NULL,
    slot_label   VARCHAR(100) NULL,
    CONSTRAINT fk_mps_plan FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(meal_plan_id) ON DELETE CASCADE,
    INDEX idx_mps_plan (meal_plan_id)
);

CREATE TABLE IF NOT EXISTS meal_plan_options (
    option_id        BIGINT AUTO_INCREMENT PRIMARY KEY,
    slot_id          BIGINT NOT NULL,
    mealdb_id        VARCHAR(50) NULL,
    meal_name        VARCHAR(255) NOT NULL,
    meal_thumb       VARCHAR(500) NULL,
    notes            VARCHAR(500) NULL,
    quantity         DECIMAL(7,2) NULL,
    unit             VARCHAR(20) NULL,
    calories_per_100 DECIMAL(7,2) NULL,
    protein_per_100  DECIMAL(6,2) NULL,
    carbs_per_100    DECIMAL(6,2) NULL,
    fat_per_100      DECIMAL(6,2) NULL,
    sugar_per_100    DECIMAL(6,2) NULL,
    fiber_per_100    DECIMAL(6,2) NULL,
    CONSTRAINT fk_mpo_slot FOREIGN KEY (slot_id) REFERENCES meal_plan_slots(slot_id) ON DELETE CASCADE,
    INDEX idx_mpo_slot (slot_id)
);
