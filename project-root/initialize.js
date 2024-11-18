const sql = require("mssql");
const initializeTables = require("./models/createTable");
require("dotenv").config();

const waitForSqlServer = async (maxRetries = 10, retryDelay = 5000) => {
  console.log("Waiting for SQL Server to be ready...");
  const config = {
    user: process.env.DB_USER, // ชื่อผู้ใช้ฐานข้อมูล
    password: process.env.DB_PASSWORD, // รหัสผ่านของผู้ใช้ฐานข้อมูล
    server: process.env.DB_HOST, // ที่อยู่ของเซิร์ฟเวอร์ เช่น 'localhost'
    port: 1433, // พอร์ตของ SQL Server
    database: process.env.DB_NAME, // ชื่อฐานข้อมูล
    options: {
      encrypt: true, // ใช้ encrypt ถ้าเชื่อมต่อกับ Azure
      trustServerCertificate: true, // ใช้เมื่อเชื่อมต่อกับ localhost
    },
  };

  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const pool = await sql.connect(config);
      console.log("SQL Server is ready!");
      await pool.close(); // Close the connection
      return true;
    } catch (err) {
      console.error(`Attempt ${attempt} failed: ${err.message}`);
      if (attempt === maxRetries) {
        throw new Error("SQL Server is not ready after maximum retries.");
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
};

const runInitialization = async () => {
  try {
    console.log("Starting database initialization...");
    await waitForSqlServer(); // Wait for SQL Server to be ready
    await initializeTables(); // Initialize tables
    console.log("Database initialization completed successfully.");
  } catch (err) {
    console.error("Database initialization failed:", err.message);
    process.exit(1); // Exit with an error code on failure
  }
};

runInitialization();
