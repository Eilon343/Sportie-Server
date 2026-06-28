use sportieDb;

-- Additive only: add nullable per-option quantity + per-100g macro columns to
-- meal_slot_options. Per-100g values are stored; scaled totals (using quantity)
-- are computed in code, never persisted. No existing data is touched.
alter table meal_slot_options add column (
    quantity         decimal(7,2) null,
    unit             varchar(20) null,
    calories_per_100 decimal(7,2) null,
    protein_per_100  decimal(6,2) null,
    carbs_per_100    decimal(6,2) null,
    fat_per_100      decimal(6,2) null,
    sugar_per_100    decimal(6,2) null,
    fiber_per_100    decimal(6,2) null
);
