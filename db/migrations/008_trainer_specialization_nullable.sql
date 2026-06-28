use sportieDb;

-- Allow trainers to be created at sign-up with only trainer_id and name.
-- specialization (and other profile fields) are filled in later via Settings.
alter table trainers modify specialization varchar(255);
