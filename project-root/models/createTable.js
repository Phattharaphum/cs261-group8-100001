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
        address NVARCHAR(255),
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

const createAttachmentInfoTable = `
IF OBJECT_ID('attachment_info', 'U') IS NULL 
BEGIN
    CREATE TABLE attachment_info (
        id INT IDENTITY(1,1) PRIMARY KEY,
        petition_id INT,
        file_extension VARCHAR(255),
        file_name VARCHAR(255),
        file_description TEXT,
        file_path VARCHAR(255),
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

        await pool.request().query(createAttachmentInfoTable);
        console.log('Attachment info table created successfully or already exists.');
    } catch (err) {
        console.error('Error creating tables:', err);
    } finally {
        // ปิดการเชื่อมต่อฐานข้อมูล
        await sql.close();
    }
};

// เรียกใช้ฟังก์ชันเพื่อสร้างตาราง
initializeTables();