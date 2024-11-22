const sql = require("mssql");
require("dotenv").config();

// Configuration for the database connection
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  port: 1433,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

// SQL Scripts for Table Creation
const createPetitionTable = `
IF OBJECT_ID('petition', 'U') IS NULL
BEGIN
    CREATE TABLE petition (
        petition_id INT IDENTITY(1,1) PRIMARY KEY,
        student_id NVARCHAR(20) NOT NULL,
        student_name NVARCHAR(100) NOT NULL,
        major NVARCHAR(50),
        year INT,
        house_number NVARCHAR(50),           
        moo NVARCHAR(50),                    
        sub_district NVARCHAR(100),          
        district NVARCHAR(100),              
        province NVARCHAR(100),              
        postcode NVARCHAR(10),               
        student_phone NVARCHAR(15),
        guardian_phone NVARCHAR(15),
        petition_type NVARCHAR(50),
        semester NVARCHAR(20),
        subject_code NVARCHAR(20),
        subject_name NVARCHAR(100),
        section NVARCHAR(10),
        reason NVARCHAR(MAX),                
        status TINYINT NOT NULL DEFAULT 1,
        submit_time DATETIME DEFAULT GETDATE(),
        review_time DATETIME,
        review_time_a DATETIME,
        review_time_b DATETIME,
        review_time_c DATETIME,
        review_time_d DATETIME,
        review_time_e DATETIME,
        review_time_f DATETIME,
        comment_a NVARCHAR(MAX),
        comment_b NVARCHAR(MAX),
        comment_c NVARCHAR(MAX),
        comment_d NVARCHAR(MAX),
        comment_e NVARCHAR(MAX)
    );
END;
`;

const createSystemLogsTable = `
IF OBJECT_ID('system_logs', 'U') IS NULL 
BEGIN
    CREATE TABLE system_logs (
        log_id INT IDENTITY(1,1) PRIMARY KEY,
        staff_id INT NULL,
        tuusername NVARCHAR(50),
        role INT CHECK (role BETWEEN 1 AND 5), -- 1=student, 2=advisor, 3=lecturer, 4=staff, 5=admin
        action NVARCHAR(100),
        description NVARCHAR(MAX),
        timestamp DATETIME DEFAULT GETDATE(),
        ip_address NVARCHAR(45),
        device_info TEXT
    );
END;
`;

const createCoursesTable = `
IF OBJECT_ID('courses', 'U') IS NULL 
BEGIN
    CREATE TABLE courses (
        course_id INT IDENTITY(1,1) PRIMARY KEY,
        course_code NVARCHAR(20),
        course_name NVARCHAR(200),
        sections NVARCHAR(MAX),
        curriculum_year INT
    );
END;
`;

const createFacultyStaffTable = `
IF OBJECT_ID('faculty_staff', 'U') IS NULL 
BEGIN
    CREATE TABLE faculty_staff (
        staff_id INT IDENTITY(1,1) PRIMARY KEY,
        university_id NVARCHAR(50),
        academic_title NVARCHAR(50),
        personal_title NVARCHAR(10),
        first_name NVARCHAR(100),
        last_name NVARCHAR(100),
        status INT DEFAULT 1,
        office TEXT,
        role INT CHECK (role BETWEEN 1 AND 3) -- 1=อาจารย์, 2=คณบดี, 3=เจ้าหน้าที่วิชาการ
    );
END;
`;

const createSciITStaffTable = `
IF OBJECT_ID('sci_IT_staff', 'U') IS NULL 
BEGIN
    CREATE TABLE sci_IT_staff (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(50),
        password NVARCHAR(255),
        name NVARCHAR(100)
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

const createFileTable = `
IF OBJECT_ID('localdoc', 'U') IS NULL 
BEGIN
    CREATE TABLE localdoc (
        file_id INT IDENTITY(1,1) PRIMARY KEY,       -- id ไฟล์
        petition_id INT NOT NULL,                    -- petition id
        file_type NVARCHAR(50),                      -- สกุลไฟล์
        file_name NVARCHAR(100) NOT NULL,            -- ชื่อไฟล์
        description NVARCHAR(255),                   -- คำอธิบาย
        file_path NVARCHAR(255) NOT NULL,            -- ที่อยู่
        FOREIGN KEY (petition_id) REFERENCES petition(petition_id) -- เชื่อมโยงกับ petition
    );
END;
`;

// Function to initialize the tables
const initializeTables = async () => {
  try {
    const pool = await sql.connect(config);

    console.log("Initializing tables...");

    await pool.request().query(createPetitionTable);
    console.log("Petition table created successfully or already exists.");

    await pool.request().query(createSystemLogsTable);
    console.log("System Logs table created successfully or already exists.");

    await pool.request().query(createCoursesTable);
    console.log("Courses table created successfully or already exists.");

    await pool.request().query(createFacultyStaffTable);
    console.log("Faculty Staff table created successfully or already exists.");

    await pool.request().query(createSciITStaffTable);
    console.log("SCI IT Staff table created successfully or already exists.");

    await pool.request().query(createAdvisorInfoTable);
    console.log("Advisor Info table created successfully or already exists.");

    await pool.request().query(createFileTable);
    console.log("File table created successfully or already exists.");

    console.log("All tables initialized successfully.");
  } catch (err) {
    console.error("Error initializing tables:", err);
    throw err;
  } finally {
    await sql.close();
    console.log("Database connection closed.");
  }
};

module.exports = initializeTables;
