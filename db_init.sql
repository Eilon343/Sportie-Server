create database if not exists sportieDb;
use sportieDb;

create table if not exists users (
    user_id int auto_increment primary key,
    email varchar(255) not null unique,
    password varchar(255) not null,
    role enum('trainer', 'trainee') not null,
    created_at timestamp default current_timestamp
);

create table if not exists trainers (
    trainer_id int primary key,
    name varchar(255) not null,
    specialization varchar(255) not null,
    avatar_color varchar(50),
    avatar_url varchar(255),
    foreign key (trainer_id) references users(user_id) on delete cascade
);

create table if not exists trainer_monthly_activity (
    activity_id int auto_increment primary key,
    trainer_id int,
    month_index int,
    trainee_count int,
    foreign key (trainer_id) references trainers(trainer_id) on delete cascade
);

create table if not exists trainees(
    trainee_id int primary key,
    name varchar(100) not null,
    goal varchar(100),
    progress int default 0,
    last_activity varchar(255),
    avatar_color varchar(50),
    avatar_url varchar(255),
    trainer_id int,
    foreign key (trainer_id) references trainers(trainer_id),
    foreign key (trainee_id) references users(user_id) on delete cascade
);