use sportieDb;

-- 1. meal_plans: an assigned meal plan owned by ONE trainee (a copy of a template).
create table if not exists meal_plans (
    meal_plan_id       bigint auto_increment primary key,
    trainee_id         int not null,
    name               varchar(255) not null,
    source_template_id bigint null,
    -- Only one meal plan is active per trainee at a time, mirroring training_plans.is_active.
    -- Assign flips the old one to 0 and inserts the new one as 1 in a single transaction.
    is_active          boolean not null default true,
    created_at         timestamp default current_timestamp,
    constraint fk_mp_trainee foreign key (trainee_id) references trainees(trainee_id) on delete cascade,
    index idx_mp_trainee (trainee_id)
);

-- 2. meal_plan_slots: Meal 1, Meal 2, ... within a plan. Mirrors meal_template_slots.
create table if not exists meal_plan_slots (
    slot_id      bigint auto_increment primary key,
    meal_plan_id bigint not null,
    slot_index   int not null,
    slot_label   varchar(100) null,
    constraint fk_mps_plan foreign key (meal_plan_id) references meal_plans(meal_plan_id) on delete cascade,
    index idx_mps_plan (meal_plan_id)
);

-- 3. meal_plan_options: the choices within a slot. Mirrors meal_slot_options
--    including the per-100g macro columns added in migration 003.
create table if not exists meal_plan_options (
    option_id        bigint auto_increment primary key,
    slot_id          bigint not null,
    mealdb_id        varchar(50) null,
    meal_name        varchar(255) not null,
    meal_thumb       varchar(500) null,
    notes            varchar(500) null,
    quantity         decimal(7,2) null,
    unit             varchar(20) null,
    calories_per_100 decimal(7,2) null,
    protein_per_100  decimal(6,2) null,
    carbs_per_100    decimal(6,2) null,
    fat_per_100      decimal(6,2) null,
    sugar_per_100    decimal(6,2) null,
    fiber_per_100    decimal(6,2) null,
    constraint fk_mpo_slot foreign key (slot_id) references meal_plan_slots(slot_id) on delete cascade,
    index idx_mpo_slot (slot_id)
);
