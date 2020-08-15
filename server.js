const express = require('express');
const CosmosClient = require('@azure/cosmos').CosmosClient;
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());

const cosmosClient = new CosmosClient({
    endpoint: process.env.DB_ENDPOINT,
    key: process.env.DB_KEY
});
const db = cosmosClient.database('db');

let logs = '';
const log = (...msg) => {
    let newLog = '<p>';
    for (m of msg) {
        if (typeof m === 'object') {
            newLog += JSON.stringify(m) + ' ';
        } else {
            newLog += m.toString() + ' ';
        }
    }
    newLog += '</p>';
    logs += newLog;
    console.log(...msg);
};

app.get('/', (req, res) => {
    res.send(logs);
});

app.post('/api/user/register', async (req, res) => {
    log('[POST] /api/user/register');

    try {
        const { firstName, lastName, email, phone, userType } = req.body;
        if (!firstName || !lastName || !email || !phone || !userType)
            throw new Error(`Missing field(s)!`);
        await db.container('users').items.create({
            firstName,
            lastName,
            email,
            phone,
            userType
        });
        log(`${email} registered successfully.`);
        res.send(true);
    } catch (err) {
        log(`[ERROR] ${err}`);
        res.status(400).send(err.message);
    }
});

app.post('/api/user/login', async (req, res) => {
    log('[POST] /api/user/login');

    try {
        const { email, phone } = req.body;
        if (email) {
            const result = await db.container('users').items.query({
                query: `SELECT * FROM c WHERE c.email="${email}"`
            }).fetchAll();
            const isRegistered = result.resources.length > 0;
            log(`${email} tried to log in. Status: ${isRegistered ? 'success' : 'failed'}`);
            res.send(isRegistered);
        } else if (phone) {
            const result = await db.container('users').items.query({
                query: `SELECT * FROM c WHERE c.phone="${phone}"`
            }).fetchAll();
            const isRegistered = result.resources.length > 0;
            log(`${phone} tried to logged in. Status: ${isRegistered ? 'success' : 'failed'}`);
            res.send(isRegistered);
        } else {
            throw new Error(`Missing field(s)!`);
        }
    } catch (err) {
        log(`[ERROR] ${err}`);
        res.status(400).send(err.message);
    }
});

app.post('/api/course', async (req, res) => {
    log('[POST] /api/course');

    try {
        const { name, image, instructor } = req.body;
        if (!name || !image || !instructor)
            throw new Error(`Missing field(s)!`);
        await db.container('courses').items.create({
            name,
            image,
            instructor
        });
        log(`Course ${name} added.`);
        res.send(true);
    } catch (err) {
        log(`[ERROR] ${err}`);
        res.status(400).send(err.message);
    }
});

app.get('/api/course', async (req, res) => {
    log('[GET] /api/course');

    try {
        const result = await db.container('courses').items.query({
            query: `SELECT * FROM c`
        }).fetchAll();
        res.send(result.resources);
    } catch (err) {
        log(`[ERROR] ${err}`);
        res.status(400).send(err.message);
    }
});

app.get('/api/course/:courseId', async (req, res) => {
    log('[GET] /api/course/:courseId');

    try {
        const { courseId } = req.params;
        const result = await db.container('courses').items.query({
            query: `SELECT * FROM c WHERE c.id="${courseId}"`
        }).fetchAll();
        if (result.resources < 1)
            throw new Error('Course not found');
        const course = result.resources[0];
        const instructorId = course.instructor;
        const result2 = await db.container('users').items.query({
            query: `SELECT * FROM c WHERE c.id="${instructorId}"`
        }).fetchAll();
        course.instructor = result2.resources[0];
        res.send(course);
    } catch (err) {
        log(`[ERROR] ${err}`);
        res.status(400).send(err.message);
    }
});

app.listen(PORT, () => {
    log(`Server running on port ${PORT}.`);
});
