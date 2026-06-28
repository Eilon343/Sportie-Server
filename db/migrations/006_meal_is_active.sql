use sportieDb;

-- Additive: meal_plans.is_active. Note it already exists in environments built
-- from migration 004 (where the table was created with it), so guard with
-- IF NOT EXISTS (TiDB supports it) to keep this safe to run anywhere.
alter table meal_plans
    add column if not exists is_active tinyint(1) not null default 1;
