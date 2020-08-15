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

let logs;
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
        log(`${email} failed to register.`);
        res.status(400).send(false);
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
            res.status(400).send(false);
        }
    } catch (err) {
        res.status(400).send(false);
    }
});

app.listen(PORT, () => {
    log(`Server running on port ${PORT}.`);
});
