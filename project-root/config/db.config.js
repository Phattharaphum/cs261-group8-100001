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

module.exports = sql.connect(config);
