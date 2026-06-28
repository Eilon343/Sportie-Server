use sportieDb;

-- Day-total macros for meal plans/templates, so the trainee app can display a plan's
-- calories/protein/carbs/fat without recomputing on the client.
-- Totals are computed in the service: per option = per_100 * quantity / 100 (quantity
-- null/0 => 0); per slot = AVERAGE of its options (slots are "pick one"); day = sum of slots.
-- IF NOT EXISTS keeps this re-runnable (the migrate runner has no applied-migration tracking).

alter table meal_templates
    add column if not exists total_calories decimal(8,2) not null default 0,
    add column if not exists total_protein  decimal(7,2) not null default 0,
    add column if not exists total_carbs    decimal(7,2) not null default 0,
    add column if not exists total_fat      decimal(7,2) not null default 0;

alter table meal_plans
    add column if not exists total_calories decimal(8,2) not null default 0,
    add column if not exists total_protein  decimal(7,2) not null default 0,
    add column if not exists total_carbs    decimal(7,2) not null default 0,
    add column if not exists total_fat      decimal(7,2) not null default 0;
