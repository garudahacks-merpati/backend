const express = require('express');
const CosmosClient = require('@azure/cosmos').CosmosClient;
const moment = require('moment');
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
        const courses = result.resources;
        for (const course of courses)
        {
            const instructorId = course.instructor;
            const result2 = await db.container('users').items.query({
                query: `SELECT * FROM c WHERE c.id="${instructorId}"`
            }).fetchAll();
            course.instructor = result2.resources[0];
        }
        res.send(courses);
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

app.get('/api/course/:courseId/lesson', async (req, res) => {
    log('[GET] /api/course/:courseId/lesson');

    try {
        const { courseId } = req.params;
        const result = await db.container('lessons').items.query({
            query: `SELECT * FROM c WHERE c.course="${courseId}"`
        }).fetchAll();
        const lessons = result.resources;
        res.send(lessons);
    } catch (err) {
        log(`[ERROR] ${err}`);
        res.status(400).send(err.message);
    }
});

app.post('/api/course/:courseId/lesson', async (req, res) => {
    log('[POST] /api/course/:courseId/lesson');

    try {
        const { courseId } = req.params;
        const { title, text, attachment, dateDue } = req.body;
        if (!title || !text || !attachment || !dateDue)
            throw new Error(`Missing field(s)!`);
        await db.container('lessons').items.create({
            title,
            text,
            attachment,
            dateDue,
            course: courseId,
            datePosted: moment().unix()
        });
        res.send(true);
    } catch (err) {
        log(`[ERROR] ${err}`);
        res.status(400).send(err.message);
    }
});

app.get('/api/lesson/:lessonId', async (req, res) => {
    log('[GET] /api/lesson/:lessonId');

    try {
        const { lessonId } = req.params;
        const result = await db.container('lessons').items.query({
            query: `SELECT * FROM c WHERE c.id="${lessonId}"`
        }).fetchAll();
        if (result.resources < 1)
            throw new Error('Lesson not found');
        res.send(result.resources[0]);
    } catch (err) {
        log(`[ERROR] ${err}`);
        res.status(400).send(err.message);
    }
});

app.get('/api/course/:courseId/assignment', async (req, res) => {
    log('[GET] /api/course/:courseId/assignment');

    try {
        const { courseId } = req.params;
        const result = await db.container('assignments').items.query({
            query: `SELECT * FROM c WHERE c.course="${courseId}"`
        }).fetchAll();
        const assignments = result.resources;
        res.send(assignments);
    } catch (err) {
        log(`[ERROR] ${err}`);
        res.status(400).send(err.message);
    }
});

app.post('/api/course/:courseId/assignment', async (req, res) => {
    log('[POST] /api/course/:courseId/assignment');

    try {
        const { courseId } = req.params;
        const { title, text, attachment, dateDue } = req.body;
        if (!title || !text || !attachment || !dateDue)
            throw new Error(`Missing field(s)!`);
        await db.container('assignments').items.create({
            title,
            text,
            attachment,
            dateDue,
            course: courseId,
            datePosted: moment().unix()
        });
        res.send(true);
    } catch (err) {
        log(`[ERROR] ${err}`);
        res.status(400).send(err.message);
    }
});

app.get('/api/assignment/:assignmentId', async (req, res) => {
    log('[GET] /api/assignment/:assignmentId');

    try {
        const { assignmentId } = req.params;
        const result = await db.container('assignments').items.query({
            query: `SELECT * FROM c WHERE c.id="${assignmentId}"`
        }).fetchAll();
        if (result.resources < 1)
            throw new Error('Assignment not found');
        res.send(result.resources[0]);
    } catch (err) {
        log(`[ERROR] ${err}`);
        res.status(400).send(err.message);
    }
});

app.get('/api/user/:userId/course', async (req, res) => {
    log('[GET] /api/user/:userId/course');

    try {
        const { userId } = req.params;
        const result = await db.container('userToCourses').items.query({
            query: `SELECT * FROM c WHERE c.user="${userId}"`
        }).fetchAll();
        const userToCourses = result.resources;
        const courses = await Promise.all(userToCourses.map(userToCourse => new Promise(async (resolve, reject) => {
            const result2 = await db.container('courses').items.query({
                query: `SELECT * FROM c WHERE c.id="${userToCourse.course}"`
            }).fetchAll();
            resolve(result2.resources[0]);
        })));
        res.send(courses);
    } catch (err) {
        log(`[ERROR] ${err}`);
        res.status(400).send(err.message);
    }
});

app.get('/api/course/:courseId/user', async (req, res) => {
    log('[GET] /api/course/:courseId/user');

    try {
        const { courseId } = req.params;
        const result = await db.container('userToCourses').items.query({
            query: `SELECT * FROM c WHERE c.course="${courseId}"`
        }).fetchAll();
        const userToCourses = result.resources;
        const users = await Promise.all(userToCourses.map(userToCourse => new Promise(async (resolve, reject) => {
            const result2 = await db.container('users').items.query({
                query: `SELECT * FROM c WHERE c.id="${userToCourse.user}"`
            }).fetchAll();
            resolve(result2.resources[0]);
        })));
        res.send(users);
    } catch (err) {
        log(`[ERROR] ${err}`);
        res.status(400).send(err.message);
    }
});

app.post('/api/userToCourse/', async (req, res) => {
    log('[POST] /api/userToCourse/');

    try {
        const { user, course } = req.body;
        if (!user || !course)
            throw new Error(`Missing field(s)!`);
        await db.container('userToCourses').items.create({
            user,
            course
        });
        res.send(true);
    } catch (err) {
        log(`[ERROR] ${err}`);
        res.status(400).send(err.message);
    }
});

app.listen(PORT, () => {
    log(`Server running on port ${PORT}.`);
});
