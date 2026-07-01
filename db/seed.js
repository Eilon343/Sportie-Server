require('dotenv').config();
const bcrypt = require('bcrypt');
const path = require('path');
const data = require('./ListOfTrainees.json');
const { dbConnection } = require('./connection');

// Wipes the user/trainer/trainee tables and refills them from db/ListOfTrainees.json.
async function seedDb() {
    const connection = await dbConnection.createRawConnection({ multipleStatements: true });

    try {
        console.log('Connected to the database.');
        console.log('Cleaning database safely...');

        await connection.query('USE sportieDb');
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('TRUNCATE TABLE trainer_monthly_activity');
        await connection.query('TRUNCATE TABLE trainees');
        await connection.query('TRUNCATE TABLE trainers');
        await connection.query('TRUNCATE TABLE users');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('Database cleaned. Starting seeding...');

        for (const trainer of data.trainers) {
            console.log('Processing ID:', trainer.id);
            const hashPassword = await bcrypt.hash(trainer.password, 10);
            await connection.execute(
                'INSERT INTO users (user_id, email, password, role) VALUES (?, ?, ?, ?)',
                [trainer.id, trainer.email, hashPassword, 'trainer']
            );
            await connection.execute(
                'INSERT INTO trainers (trainer_id, name, specialization, avatar_color, avatar_url) VALUES (?, ?, ?, ?, ?)',
                [trainer.id, trainer.name, trainer.specialization, trainer.avatarColor, trainer.avatarUrl]
            );
            for (let i = 0; i < trainer.monthlyActiveTrainees.length; i++) {
                await connection.execute(
                    'INSERT INTO trainer_monthly_activity (trainer_id, month_index, trainee_count) VALUES (?, ?, ?)',
                    [trainer.id, i, trainer.monthlyActiveTrainees[i]]
                );
            }
        }

        for (const trainee of data.trainees) {
            const hashPassword = await bcrypt.hash(trainee.password, 10);
            await connection.execute(
                'INSERT INTO users (user_id, email, password, role) VALUES (?, ?, ?, ?)',
                [trainee.id, trainee.email, hashPassword, 'trainee']
            );
            await connection.execute(
                'INSERT INTO trainees (trainee_id, name, goal, progress, last_activity, avatar_color, avatar_url, trainer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    trainee.id,
                    trainee.name,
                    trainee.goal,
                    trainee.progress,
                    trainee.lastActivity,
                    trainee.avatarColor,
                    trainee.avatarUrl,
                    trainee.trainerId,
                ]
            );
        }

        console.log('Seeding complete.');
    } catch (error) {
        console.error('Error occurred while seeding the database:', error);
        process.exitCode = 1;
    } finally {
        await connection.end();
        console.log('Database connection closed.');
    }
}

seedDb();
