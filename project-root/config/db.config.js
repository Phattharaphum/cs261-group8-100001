// project-root/config/db.config.js

const sql = require('mssql');

const config = {
    user: 'sa',                      // ชื่อผู้ใช้ฐานข้อมูล
    password: 'YourStrong!Passw0rd', // รหัสผ่านของผู้ใช้ฐานข้อมูล
    server: 'localhost',             // ที่อยู่ของเซิร์ฟเวอร์ เช่น 'localhost'
    port: 1433,                      // พอร์ตของ SQL Server
    database: 'db01',                // ชื่อฐานข้อมูล
    options: {
        encrypt: true,               // ใช้ encrypt ถ้าเชื่อมต่อกับ Azure
        trustServerCertificate: true // ใช้เมื่อเชื่อมต่อกับ localhost
    }
};

const connectToDatabase = async () => {
    try {
        // ตรวจสอบว่ามีการเชื่อมต่อแล้วหรือไม่
        if (!sql.pool) {
            await sql.connect(config);
            console.log('Connected to the database');
        }
    } catch (error) {
        console.error('Database connection failed:', error);
    }
};

connectToDatabase();

module.exports = sql;