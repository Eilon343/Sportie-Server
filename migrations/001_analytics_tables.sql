-- Migration 001: Trainer analytics tables
-- Engine: TiDB Cloud (MySQL-compatible)
-- Safe to re-run: every table uses IF NOT EXISTS.
-- FKs reference REAL existing column names confirmed against controller SQL:
--   trainees(trainee_id), training_plans(plan_id), exercises(exercise_id), plan_exercises(plan_exercise_id)
-- This file is generated ONLY. Do NOT run it against the live DB automatically.

use sportieDb;

-- 1. workout_sessions: one row per actual (or scheduled) training session.
--    Enables: at-risk (#1), attendance (#2), volume (#4), engagement heatmap (#5).
create table if not exists workout_sessions (
    session_id     bigint auto_increment primary key,
    trainee_id     int not null,
    plan_id        int null,
    scheduled_date date null,
    performed_at   datetime null,
    status         enum('scheduled','completed','missed','cancelled') not null default 'scheduled',
    notes          varchar(500) null,
    created_at     timestamp default current_timestamp,
    constraint fk_ws_trainee foreign key (trainee_id) references trainees(trainee_id) on delete cascade,
    constraint fk_ws_plan    foreign key (plan_id)    references training_plans(plan_id) on delete set null,
    index idx_ws_trainee_performed (trainee_id, performed_at),
    index idx_ws_trainee_status    (trainee_id, status),
    index idx_ws_performed         (performed_at)
);

-- 2. logged_sets: one row per actually-performed set.
--    Enables: volume over time (#4), strength leaderboard (#3, est. 1RM).
create table if not exists logged_sets (
    logged_set_id    bigint auto_increment primary key,
    session_id       bigint not null,
    exercise_id      varchar(50) null,
    plan_exercise_id int null,
    set_number       int not null,
    reps             int not null,
    weight           decimal(6,2) not null,
    created_at       timestamp default current_timestamp,
    constraint fk_ls_session       foreign key (session_id)       references workout_sessions(session_id) on delete cascade,
    constraint fk_ls_exercise      foreign key (exercise_id)      references exercises(exercise_id) on delete set null,
    constraint fk_ls_plan_exercise foreign key (plan_exercise_id) references plan_exercises(plan_exercise_id) on delete set null,
    index idx_ls_session  (session_id),
    index idx_ls_exercise (exercise_id)
);

-- 3. trainee_metrics: dated time series of measurable metrics.
--    Enables: body-composition leaderboard (#3).
create table if not exists trainee_metrics (
    metric_id   bigint auto_increment primary key,
    trainee_id  int not null,
    metric_type enum('body_weight','body_fat_pct','muscle_mass') not null,
    value       decimal(7,2) not null,
    measured_at date not null,
    created_at  timestamp default current_timestamp,
    constraint fk_tm_trainee foreign key (trainee_id) references trainees(trainee_id) on delete cascade,
    -- The UNIQUE key below also serves as the requested (trainee_id, metric_type, measured_at)
    -- index, so a separate duplicate index is omitted intentionally.
    unique key uq_tm_trainee_type_date (trainee_id, metric_type, measured_at)
);
