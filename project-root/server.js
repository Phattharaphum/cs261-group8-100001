// project-root/server.js

const express = require('express');
const app = express();
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');
const sql = require('./config/db.config'); // นำเข้าการเชื่อมต่อฐานข้อมูลเพียงครั้งเดียว
const userRoutes = require('./routes/userRoutes');
const { isAuthenticated, isStudent, isTeacher } = require('./middleware/authMiddleware');
const loggerMiddleware = require('./middleware/loggerMiddleware');
const errorHandler = require('./middleware/errorHandler');

dotenv.config(); // โหลด environment variables จาก .env

// Middleware สำหรับการจัดการ JSON และ static files
app.use(express.json());
app.use(express.static('public'));

const fs = require('fs');
const multer = require('multer');

// สร้างโฟลเดอร์สำหรับเก็บไฟล์ถ้าไม่มีโฟลเดอร์
const uploadFolder = path.join(__dirname, 'attachments');
if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true });
}

// กำหนดค่า multer สำหรับจัดการการอัปโหลดไฟล์
const allowedTypes = [
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'image/jpeg', 
    'image/png'
];

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadFolder),
        filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
    }),
    limits: { fileSize: 1 * 1024 * 1024 }, // กำหนดขนาดไฟล์สูงสุด 1MB
    fileFilter: (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true); // ประเภทไฟล์ถูกต้อง
        } else {
            cb(new Error('ประเภทไฟล์ไม่ถูกต้อง กรุณาเลือกไฟล์ที่เป็น PDF, DOC, DOCX, JPG หรือ PNG')); // ประเภทไฟล์ไม่ถูกต้อง
        }
    }
}).fields([{ name: 'file1' }, { name: 'file2' }, { name: 'file3' }]);

// Route สำหรับอัปโหลดไฟล์และแจ้งเตือนกรณีไฟล์ไม่ผ่านเงื่อนไข
/*app.post('/upload-file', (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: 'ไฟล์มีขนาดเกิน 1MB กรุณาอัปโหลดไฟล์ที่เล็กกว่า'
            });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาเลือกไฟล์ก่อนอัปโหลด'
            });
        }

        res.json({ success: true, message: 'ไฟล์อัปโหลดสำเร็จ' });
    });
});*/
// ใช้งาน session
app.use(session({
    secret: 'your_secret_key', // คีย์สำหรับเข้ารหัส session
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, // ตั้งเป็น true ถ้าใช้งานผ่าน HTTPS
        httpOnly: true  // ป้องกันการเข้าถึงจาก client-side JavaScript
    }
}));

// ใช้งาน logger และ error handler
app.use(loggerMiddleware);
app.use(errorHandler);

// Route สำหรับดึง API Key
app.get('/api/get-api-key', (req, res) => {
    res.json({ apiKey: process.env.API_KEY });
});

// Route สำหรับ user routes
app.use('/api', userRoutes);

// Route สำหรับการล็อกอิน

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const apiKey = process.env.API_KEY;

    try {
        // ตรวจสอบ username และ password สำหรับ userType: 'teacher'
        if (username === '0001' && password === 'test') {
            req.session.user = {
                username: username,
                email: 'teacher@example.com', // ตัวอย่างข้อมูล
                displayname_en: 'Teacher',
                displayname_th: 'ครู',
                faculty: 'Faculty of Education',
                department: 'Education Department',
                userType: 'teacher'
            };

            // ส่ง response กลับไปยัง client โดยให้ redirect ไปที่หน้า hometeacher
            res.json({
                success: true,
                redirectUrl: '/advisorPetitions'
            });
        } else {
            // ถ้า username และ password ไม่ตรงตามเงื่อนไข ให้เรียก TU API
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

            // ตรวจสอบการเข้าสู่ระบบจาก API
            if (data.status === true) {
                req.session.user = {
                    username: data.username,
                    email: data.email,
                    displayname_en: data.displayname_en,
                    displayname_th: data.displayname_th,
                    faculty: data.faculty,
                    department: data.department,
                    userType: 'student'
                };

                // ส่ง response กลับไปยัง client โดยให้ redirect ไปที่หน้า homestudent
                res.json({
                    success: true,
                    redirectUrl: '/draftPetitions'
                });
            } else {
                // กรณี API แจ้งว่าข้อมูลไม่ถูกต้อง
                res.json({ success: false, message: data.message });
            }
        }
    } catch (error) {
        console.error('Error connecting to TU API:', error);
        res.status(500).json({ success: false, message: 'Failed to connect to TU API' });
    }
});


// Route สำหรับหน้าของนักศึกษา
app.get('/homestudent', isAuthenticated, isStudent, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'homestudent.html'));
});

// Route สำหรับหน้าของอาจารย์
app.get('/hometeacher', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'hometeacher.html'));
});

// Route สำหรับดึงข้อมูล session
app.get('/get-session-data', (req, res) => {
    if (req.session.user) {
        res.json({
            student_id: req.session.user.username,
            student_name: req.session.user.displayname_th,
            department: req.session.user.department
        });
    } else {
        res.json({
            student_id: '',
            student_name: '',
            department:''
        });
    }
});

// Route สำหรับ submit คำร้อง
/*app.post('/submit-petition', express.json(), async (req, res) => {
    const {
        student_id, student_name, major, year, address,
        student_phone, guardian_phone, petition_type, semester,
        subject_code, subject_name, section, status
    } = req.body;

    try {
        const pool = await sql.connect();
        await pool.request()
            .input('student_id', sql.NVarChar, student_id)
            .input('student_name', sql.NVarChar, student_name)
            .input('major', sql.NVarChar, major)
            .input('year', sql.Int, year)
            .input('address', sql.NVarChar, address)
            .input('student_phone', sql.NVarChar, student_phone)
            .input('guardian_phone', sql.NVarChar, guardian_phone)
            .input('petition_type', sql.NVarChar, petition_type)
            .input('semester', sql.NVarChar, semester)
            .input('subject_code', sql.NVarChar, subject_code)
            .input('subject_name', sql.NVarChar, subject_name)
            .input('section', sql.NVarChar, section)
            .input('status', sql.TinyInt, status)
            .query(`
                INSERT INTO petition (
                    student_id, student_name, major, year, address,
                    student_phone, guardian_phone, petition_type, semester,
                    subject_code, subject_name, section, status
                ) VALUES (
                    @student_id, @student_name, @major, @year, @address,
                    @student_phone, @guardian_phone, @petition_type, @semester,
                    @subject_code, @subject_name, @section, @status
                )
            `);

        res.json({ success: true });
    } catch (err) {
        console.error('Error inserting petition:', err);
        res.status(500).json({ success: false, message: 'Failed to submit petition' });
    }
});
*/
async function saveFileData(pool, petitionId, file, filename, description) {
    const filePath = file.path;
    const fileExtension = path.extname(file.originalname);
    const fileName = filename || file.originalname;

    try {
        await pool.request()
            .input('petition_id', sql.Int, petitionId)
            .input('file_extension', sql.NVarChar, fileExtension)
            .input('file_name', sql.NVarChar, fileName)
            .input('file_description', sql.NVarChar, description)
            .input('file_path', sql.NVarChar, filePath)
            .query(`
                INSERT INTO attachment_info (petition_id, file_extension, file_name, file_description, file_path)
                VALUES (@petition_id, @file_extension, @file_name, @file_description, @file_path)
            `);
        console.log("File data saved successfully.");
    } catch (error) {
        console.error('Error saving file data:', error);
        throw error; // ส่ง error กลับไปยังฟังก์ชันหลัก
    }
}

// Route สำหรับการส่งคำร้องพร้อมไฟล์แนบ
app.post('/submit-petition', upload.fields([{ name: 'file1' }, { name: 'file2' }, { name: 'file3' }]), async (req, res) => {
    try {
        // ตรวจสอบการอัปโหลดไฟล์
        if (!req.files) {
            return res.status(400).json({ success: false, message: 'No files uploaded.' });
        }

        // ดึงข้อมูลคำร้องจาก body ของ request
        const {
            student_id, student_name, major, year, address,
            student_phone, guardian_phone, petition_type, semester,
            subject_code, subject_name, section, status, filename1, desc1, filename2, desc2, filename3, desc3
        } = req.body;

        // เชื่อมต่อกับฐานข้อมูล
        const pool = await sql.connect();
        
        // บันทึกข้อมูลคำร้องในตาราง petition
        const result = await pool.request()
            .input('student_id', sql.NVarChar, student_id)
            .input('student_name', sql.NVarChar, student_name)
            .input('major', sql.NVarChar, major)
            .input('year', sql.Int, year)
            .input('address', sql.NVarChar, address)
            .input('student_phone', sql.NVarChar, student_phone)
            .input('guardian_phone', sql.NVarChar, guardian_phone)
            .input('petition_type', sql.NVarChar, petition_type)
            .input('semester', sql.NVarChar, semester)
            .input('subject_code', sql.NVarChar, subject_code)
            .input('subject_name', sql.NVarChar, subject_name)
            .input('section', sql.NVarChar, section)
            .input('status', sql.TinyInt, status)
            .query(`
                INSERT INTO petition (student_id, student_name, major, year, address, student_phone, guardian_phone, petition_type, semester, subject_code, subject_name, section, status) 
                OUTPUT INSERTED.petition_id 
                VALUES (@student_id, @student_name, @major, @year, @address, @student_phone, @guardian_phone, @petition_type, @semester, @subject_code, @subject_name, @section, @status)
            `);

        const petitionId = result.recordset[0].petition_id;

        // ตรวจสอบและบันทึกข้อมูลไฟล์แนบเฉพาะที่มีการอัปโหลดจริง ๆ
        if (req.files.file1) await saveFileData(pool, petitionId, req.files.file1[0], filename1, desc1);
        if (req.files.file2) await saveFileData(pool, petitionId, req.files.file2[0], filename2, desc2);
        if (req.files.file3) await saveFileData(pool, petitionId, req.files.file3[0], filename3, desc3);

        // ส่งสถานะสำเร็จกลับไปยัง client
        res.json({ success: true, message: 'Petition submitted successfully' });
    } catch (error) {
        if (error instanceof multer.MulterError) {
            // ข้อผิดพลาดจาก multer (เช่น ขนาดไฟล์เกิน)
            res.status(400).json({ success: false, message: error.message });
        } else {
            // ข้อผิดพลาดอื่นๆ
            console.error('Error submitting petition:', error);
            res.status(500).json({ success: false, message: 'Failed to submit petition' });
        }
    }
});

app.put('/update-petition/:id', express.json(), async (req, res) => {
    const { id } = req.params;
    const {
        student_id, student_name, major, year, address,
        student_phone, guardian_phone, petition_type, semester,
        subject_code, subject_name, section, status
    } = req.body;

    try {
        const pool = await sql.connect();
        await pool.request()
            .input('id', sql.Int, id)
            .input('student_id', sql.NVarChar, student_id)
            .input('student_name', sql.NVarChar, student_name)
            .input('major', sql.NVarChar, major)
            .input('year', sql.Int, year)
            .input('address', sql.NVarChar, address)
            .input('student_phone', sql.NVarChar, student_phone)
            .input('guardian_phone', sql.NVarChar, guardian_phone)
            .input('petition_type', sql.NVarChar, petition_type)
            .input('semester', sql.NVarChar, semester)
            .input('subject_code', sql.NVarChar, subject_code)
            .input('subject_name', sql.NVarChar, subject_name)
            .input('section', sql.NVarChar, section)
            .input('status', sql.TinyInt, status)
            .query(`
                UPDATE petition SET
                    student_id = @student_id,
                    student_name = @student_name,
                    major = @major,
                    year = @year,
                    address = @address,
                    student_phone = @student_phone,
                    guardian_phone = @guardian_phone,
                    petition_type = @petition_type,
                    semester = @semester,
                    subject_code = @subject_code,
                    subject_name = @subject_name,
                    section = @section,
                    status = @status
                WHERE petition_id = @id
            `);

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating petition:', err);
        res.status(500).json({ success: false, message: 'Failed to update petition' });
    }
});

// Route สำหรับดึง draft petitions
app.get('/draft-petitions', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const student_id = req.session.user.username;
    const query = `
        SELECT petition_id, student_id, student_name, major, year, address,
               student_phone, guardian_phone, petition_type, semester,
               subject_code, subject_name, section, status, submit_time
        FROM petition
        WHERE student_id = @student_id AND status = 1
    `;

    try {
        const pool = await sql.connect();
        const result = await pool.request()
            .input('student_id', sql.NVarChar, student_id)
            .query(query);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching draft petitions:', error);
        res.status(500).json({ error: 'Failed to fetch draft petitions' });
    }
});

// Route สำหรับแสดงหน้า draft petitions
app.get('/draft-petitions-page', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'draftPetitions.html'));
});

// Endpoint สำหรับอัปเดตข้อมูลที่ปรึกษา
app.post('/update-advisor', async (req, res) => {
    const { student_id, advisor_id } = req.body;

    if (!student_id || !advisor_id) {
        return res.status(400).json({ message: 'Student ID and Advisor ID are required.' });
    }

    try {
        const pool = await sql.connect();
        const query = `
            INSERT INTO advisor_info (student_id, advisor_id) 
            VALUES (@student_id, @advisor_id)
        `;

        await pool.request()
            .input('student_id', sql.NVarChar, student_id)
            .input('advisor_id', sql.NVarChar, advisor_id)
            .query(query);

        res.json({ message: 'Advisor updated successfully.' });
    } catch (error) {
        console.error('Error updating advisor:', error);
        res.status(500).json({ message: 'Error updating advisor information.' });
    } finally {
        sql.close();
    }
});

// Route สำหรับแสดงคำร้องของอาจารย์
app.get('/advisor-petitions', async (req, res) => {
    const advisorId = req.session.user?.username; // ใช้รหัสอาจารย์จาก session

    if (!advisorId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const query = `
            SELECT p.*
            FROM petition p
            JOIN advisor_info a ON p.student_id = a.student_id
            WHERE a.advisor_id = @advisorId AND p.status = 2
        `;

        const pool = await sql.connect();
        const result = await pool.request()
            .input('advisorId', sql.NVarChar, advisorId)
            .query(query);

        res.json(result.recordset); // ส่งข้อมูลคำร้องไปยัง client
    } catch (error) {
        console.error('Error fetching petitions:', error);
        res.status(500).json({ error: 'Failed to fetch petitions' });
    }
});

// ดึงข้อมูลคำร้องที่ยังไม่ได้ตรวจสอบและตรวจสอบแล้ว
app.get('/advisor/pending-petitions', async (req, res) => {
    try {
        const advisorId = req.session.user.username;
        const pool = await sql.connect();
        
        const pendingResult = await pool.request()
            .input('advisorId', sql.NVarChar, advisorId)
            .query(`SELECT * FROM petition WHERE status = 2 AND student_id IN 
                    (SELECT student_id FROM advisor_info WHERE advisor_id = @advisorId)`);
        
        const reviewedResult = await pool.request()
            .input('advisorId', sql.NVarChar, advisorId)
            .query(`SELECT * FROM petition WHERE status IN (3, 4, 5) AND student_id IN 
                    (SELECT student_id FROM advisor_info WHERE advisor_id = @advisorId)`);
        
        res.json({ pending: pendingResult.recordset, reviewed: reviewedResult.recordset });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch petitions' });
    }
});

// ใน server.js
app.get('/advisor/petition/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'advisorPetitionDetail.html'));
});

app.get('/advisor/petition-details/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await sql.connect();
        
        const petitionResult = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM petition WHERE petition_id = @id');
        
        res.json(petitionResult.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch petition details' });
    }
});

app.post('/advisor/update-petition/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const pool = await sql.connect();
        
        await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.TinyInt, status)
            .query('UPDATE petition SET status = @status WHERE petition_id = @id');
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to update petition status' });
    }
});


// ใน server.js
app.get('/advisorPetitions', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'advisorPetitions.html'));
});

app.get('/studentPetitions', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'studentPetitions.html'));
});

app.get('/draftPetitions', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'draftPetitions.html'));
});

app.get('/advisorPetitions', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'advisorPetitions.html'));
});

// Fetch petitions for the logged-in student
app.get('/student/petitions', async (req, res) => {
    try {
        const studentId = req.session.user.username;
        const pool = await sql.connect();
        const result = await pool.request()
            .input('studentId', sql.NVarChar, studentId)
            .query('SELECT * FROM petition WHERE student_id = @studentId AND status IN (2, 3, 4, 5)');
        
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching petitions:', err);
        res.status(500).json({ error: 'Failed to fetch petitions' });
    }
});

// Fetch details of a specific petition
app.get('/student/petition-details/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await sql.connect();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM petition WHERE petition_id = @id');
        
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error fetching petition details:', err);
        res.status(500).json({ error: 'Failed to fetch petition details' });
    }
});

// Fetch specific draft petition details by ID
app.get('/draft-petitions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await sql.connect();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM petition WHERE petition_id = @id AND status = 1'); // Ensure it's a draft
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error fetching draft petition details:', err);
        res.status(500).json({ error: 'Failed to fetch draft petition details' });
    }
});


app.get('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ error: 'Failed to log out' });
        }

        // Redirect to the login page after successful logout
        res.redirect('/index.html');
    });
});








// เริ่มเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

