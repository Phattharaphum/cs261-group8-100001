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

sql.then(pool => {
    return pool.request().query(createPetitionTable);
}).then(result => {
    console.log('Petition table created successfully or already exists.');
}).catch(err => {
    console.error('Error creating petition table:', err);
}).finally(() => {
    sql.then(pool => pool.close()); // ปิดการเชื่อมต่อฐานข้อมูล
});
