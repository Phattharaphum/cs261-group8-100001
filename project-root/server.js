const express = require('express');
const app = express();
const userRoutes = require('./routes/userRoutes');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');
const authMiddleware = require('./middleware/authMiddleware');
const loggerMiddleware = require('./middleware/loggerMiddleware');
const errorHandler = require('./middleware/errorHandler');
const sql = require('mssql');
require('./config/db.config');
// Import middleware
const { isAuthenticated, isStudent, isTeacher } = require('./middleware/authMiddleware');
const router = express.Router();

dotenv.config(); // โหลด environment variables จาก .env

app.use(express.json()); // รองรับการรับข้อมูล JSON
app.use(express.static('public')); // ให้บริการไฟล์ static จากโฟลเดอร์ public

// กำหนดเส้นทางสำหรับ API Key
app.get('/api/get-api-key', (req, res) => {
    // ส่งค่า API Key กลับไปที่ frontend
    res.json({ apiKey: process.env.API_KEY });
});


// กำหนดเส้นทางสำหรับ user routes
app.use('/api', userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// ใช้ loggerMiddleware สำหรับการบันทึก log ทุกการเข้าถึง
app.use(loggerMiddleware);
app.use(errorHandler);


app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const apiKey = process.env.API_KEY;

    try {
        // เรียกใช้ TU API เพื่อตรวจสอบการล็อกอิน
        const response = await fetch('https://restapi.tu.ac.th/api/v1/auth/Ad/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Application-Key': apiKey
            },
            body: JSON.stringify({
                UserName: username,
                PassWord: password
            })
        });

        const data = await response.json();

        if (data.status === true) {
            // เก็บข้อมูลใน session
            req.session.user = {
                username: data.username,
                email: data.email,
                displayname_en: data.displayname_en,
                displayname_th: data.displayname_th,
                faculty: data.faculty,
                department: data.department,
                userType: data.username === '6609612160' ? 'teacher' : 'student' // เปลี่ยน username เป็นของจริงที่ต้องการตรวจสอบ
            };

            // ตอบกลับไปยัง frontend
            res.json({
                success: true,
                redirectUrl: req.session.user.userType === 'teacher' ? '/hometeacher' : '/homestudent'
            });
        } else {
            // ตอบกลับเมื่อการล็อกอินล้มเหลว
            res.json({ success: false, message: data.message });
        }
    } catch (error) {
        console.error('Error connecting to TU API:', error);
        res.status(500).json({ success: false, message: 'Failed to connect to TU API' });
    }
});

// Route สำหรับนักศึกษาเท่านั้นที่สามารถเข้าถึงหน้า homestudent.html
app.get('/homestudent', isAuthenticated, isStudent, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'homestudent.html'));
});

// Route สำหรับหน้า hometeacher.html (กรณีตัวอย่าง)
app.get('/hometeacher', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'hometeacher.html'));
});

// เส้นทางสำหรับส่งข้อมูล session ไปยัง frontend
app.get('/get-session-data', (req, res) => {
    if (req.session.user) {
        res.json({
            student_id: req.session.user.username,        // กำหนด student_id จาก session
            student_name: req.session.user.displayname_th // กำหนด student_name จาก session
        });
    } else {
        res.json({
            student_id: '',
            student_name: ''
        });
    }
});

// เส้นทางในการยื่นคำร้อง
app.post('/submit-petition', express.urlencoded({ extended: true }), (req, res) => {
    const {
        student_id, student_name, major, year, address,
        student_phone, guardian_phone, petition_type, semester,
        subject_code, subject_name, section
    } = req.body;

    const query = `
        INSERT INTO petition (
            student_id, student_name, major, year, address,
            student_phone, guardian_phone, petition_type, semester,
            subject_code, subject_name, section, status
        ) VALUES (
            @student_id, @student_name, @major, @year, @address,
            @student_phone, @guardian_phone, @petition_type, @semester,
            @subject_code, @subject_name, @section, 1
        )
    `;

    sql.connect().then(pool => {
        return pool.request()
            .input('student_id', sql.NVarChar, student_id)
            .input('student_name', sql.NVarChar, student_name)
            .input('major', sql.NVarChar, major)
            .input('year', sql.Int, year)  // ตรวจสอบให้แน่ใจว่า `year` มีการส่งค่าอย่างถูกต้อง
            .input('address', sql.NVarChar, address)
            .input('student_phone', sql.NVarChar, student_phone)
            .input('guardian_phone', sql.NVarChar, guardian_phone)
            .input('petition_type', sql.NVarChar, petition_type)
            .input('semester', sql.NVarChar, semester)
            .input('subject_code', sql.NVarChar, subject_code)
            .input('subject_name', sql.NVarChar, subject_name)
            .input('section', sql.NVarChar, section)
            .query(query);
    }).then(result => {
        console.log('Petition submitted successfully');
        res.status(201).json({ message: 'Petition submitted successfully' });
    }).catch(err => {
        console.error('Error inserting petition:', err);
        res.status(500).json({ error: 'Failed to submit petition' });
    }).finally(() => {
        sql.close(); // ปิดการเชื่อมต่อฐานข้อมูล
    });
});