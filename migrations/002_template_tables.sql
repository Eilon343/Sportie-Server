use sportieDb;

-- ===========================================================================
-- WORKOUT TEMPLATES (template -> blocks -> exercises)
-- ===========================================================================

-- 1. workout_templates: a reusable workout template owned by a trainer.
create table if not exists workout_templates (
    template_id bigint auto_increment primary key,
    trainer_id  int not null,
    name        varchar(255) not null,
    mode        enum('day-specific','abstract') not null default 'day-specific',
    goal        varchar(100) null,
    created_at  timestamp default current_timestamp,
    constraint fk_wt_trainer foreign key (trainer_id) references trainers(trainer_id) on delete cascade,
    index idx_wt_trainer (trainer_id)
);

-- 2. workout_template_blocks: a day (day-specific) or Training A/B/C (abstract).
--    block_type drives behaviour: 'workout' has child exercises, 'cardio' uses
--    the free-text notes field, 'rest' carries neither.
create table if not exists workout_template_blocks (
    block_id    bigint auto_increment primary key,
    template_id bigint not null,
    block_index int not null,
    label       varchar(100) null,
    block_type  enum('workout','cardio','rest') not null default 'workout',
    notes       varchar(500) null,
    constraint fk_wtb_template foreign key (template_id) references workout_templates(template_id) on delete cascade,
    index idx_wtb_template (template_id)
);

-- 3. workout_template_exercises: ONLY for blocks of type 'workout'.
--    exercise_id references the catalog; custom_exercise_name covers off-catalog moves.
create table if not exists workout_template_exercises (
    id                   bigint auto_increment primary key,
    block_id             bigint not null,
    exercise_id          varchar(50) null,
    custom_exercise_name varchar(255) null,
    sets                 int null,
    reps                 int null,
    rest_seconds         int null,
    constraint fk_wte_block    foreign key (block_id)    references workout_template_blocks(block_id) on delete cascade,
    constraint fk_wte_exercise foreign key (exercise_id) references exercises(exercise_id) on delete set null,
    index idx_wte_block (block_id)
);

-- ===========================================================================
-- MEAL TEMPLATES (template -> slots -> options)
-- ===========================================================================

-- 4. meal_templates: a reusable meal plan template owned by a trainer.
create table if not exists meal_templates (
    template_id bigint auto_increment primary key,
    trainer_id  int not null,
    name        varchar(255) not null,
    created_at  timestamp default current_timestamp,
    constraint fk_mt_trainer foreign key (trainer_id) references trainers(trainer_id) on delete cascade,
    index idx_mt_trainer (trainer_id)
);

-- 5. meal_template_slots: Meal 1, Meal 2, ... within a template.
create table if not exists meal_template_slots (
    slot_id     bigint auto_increment primary key,
    template_id bigint not null,
    slot_index  int not null,
    slot_label  varchar(100) null,
    constraint fk_mts_template foreign key (template_id) references meal_templates(template_id) on delete cascade,
    index idx_mts_template (template_id)
);

-- 6. meal_slot_options: the variety of choices within a slot. Names/thumbs are
--    snapshotted so a template stays stable even if the external source changes.
create table if not exists meal_slot_options (
    option_id  bigint auto_increment primary key,
    slot_id    bigint not null,
    mealdb_id  varchar(50) null,
    meal_name  varchar(255) not null,
    meal_thumb varchar(500) null,
    notes      varchar(500) null,
    constraint fk_mso_slot foreign key (slot_id) references meal_template_slots(slot_id) on delete cascade,
    index idx_mso_slot (slot_id)
);
