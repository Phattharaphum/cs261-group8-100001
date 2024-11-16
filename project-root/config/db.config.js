// project-root/config/db.config.js

const sql = require("mssql");

require("dotenv").config();
console.log(process.env.DB_USER);
console.log(process.env.DB_PASSWORD);
console.log(process.env.DB_HOST);
console.log(process.env.DB_PORT);
console.log(process.env.DB_NAME);

const config = {
  user: process.env.DB_USER, // ชื่อผู้ใช้ฐานข้อมูล
  password: process.env.DB_PASSWORD, // รหัสผ่านของผู้ใช้ฐานข้อมูล
  server: process.env.DB_HOST, // ที่อยู่ของเซิร์ฟเวอร์ เช่น 'localhost'
  port: parseInt(process.env.DB_PORT, 10), // พอร์ตของ SQL Server
  database: process.env.DB_NAME, // ชื่อฐานข้อมูล
  options: {
    encrypt: true, // ใช้ encrypt ถ้าเชื่อมต่อกับ Azure
    trustServerCertificate: true, // ใช้เมื่อเชื่อมต่อกับ localhost
  },
};

const connectToDatabase = async () => {
  try {
    // ตรวจสอบว่ามีการเชื่อมต่อแล้วหรือไม่
    if (!sql.pool) {
      await sql.connect(config);
      console.log("Connected to the database");
    }
  } catch (error) {
    console.error("Database connection failed:", error);
  }
};

connectToDatabase();

module.exports = sql;
