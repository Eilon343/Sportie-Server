use sportieDb;

-- Idempotent: the column already exists in some environments (it was added
-- ad-hoc before this migration), so guard with IF NOT EXISTS (TiDB supports it).
alter table training_plans
    add column if not exists is_active boolean not null default true;
