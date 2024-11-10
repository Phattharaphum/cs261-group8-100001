// project-root/models/createTable.js

const sql = require('../config/db.config');

const createPetitionTable = `
IF OBJECT_ID('petition', 'U') IS NULL
BEGIN
    CREATE TABLE petition (
        petition_id INT IDENTITY(1,1) PRIMARY KEY,
        student_id NVARCHAR(20) NOT NULL,
        student_name NVARCHAR(100) NOT NULL,
        major NVARCHAR(50),
        year INT,
        house_number NVARCHAR(50),           -- บ้านเลขที่
        moo NVARCHAR(50),                    -- หมู่
        sub_district NVARCHAR(100),          -- แขวง/ตำบล
        district NVARCHAR(100),              -- เขต/อำเภอ
        province NVARCHAR(100),              -- จังหวัด
        postcode NVARCHAR(10),               -- รหัสไปรษณีย์
        student_phone NVARCHAR(15),
        guardian_phone NVARCHAR(15),
        petition_type NVARCHAR(50),
        semester NVARCHAR(20),
        subject_code NVARCHAR(20),
        subject_name NVARCHAR(100),
        section NVARCHAR(10),
        status TINYINT NOT NULL DEFAULT 1,
        submit_time DATETIME DEFAULT GETDATE(),
        review_time DATETIME
    );
END;

`;

const createAdvisorInfoTable = `
IF OBJECT_ID('advisor_info', 'U') IS NULL 
BEGIN
    CREATE TABLE advisor_info (
        id INT IDENTITY(1,1) PRIMARY KEY,
        student_id NVARCHAR(20) NOT NULL,
        advisor_id NVARCHAR(20) NOT NULL
    );
END;
`;

const initializeTables = async () => {
    try {
        // สร้างการเชื่อมต่อกับฐานข้อมูล
        const pool = await sql.connect();
        
        // สร้างตาราง petition
        await pool.request().query(createPetitionTable);
        console.log('Petition table created successfully or already exists.');
        
        // สร้างตาราง advisor_info
        await pool.request().query(createAdvisorInfoTable);
        console.log('Advisor info table created successfully or already exists.');
    } catch (err) {
        console.error('Error creating tables:', err);
    } finally {
        // ปิดการเชื่อมต่อฐานข้อมูล
        await sql.close();
    }
};

// เรียกใช้ฟังก์ชันเพื่อสร้างตาราง
initializeTables();