// project-root/server.js

const express = require("express");
const app = express();
const dotenv = require("dotenv");
const path = require("path");
const session = require("express-session");
const sql = require("mssql"); // นำเข้าการเชื่อมต่อฐานข้อมูลเพียงครั้งเดียว
const userRoutes = require("./routes/userRoutes");
const {
  isAuthenticated,
  isStudent,
  isTeacher,
  isAcademicStaff,
} = require("./middleware/authMiddleware");
const loggerMiddleware = require("./middleware/loggerMiddleware");
const errorHandler = require("./middleware/errorHandler");
const multer = require("multer");
const router = express.Router();
const fs = require("fs");

app.use(express.json()); // สำหรับ JSON payloads
app.use(express.urlencoded({ extended: true })); // สำหรับ form-urlencoded

dotenv.config(); // โหลด environment variables จาก .env
const initialization = require("./initialize");

// การตั้งค่าการเชื่อมต่อฐานข้อมูล
const config = {
  user: process.env.DB_USER, // ชื่อผู้ใช้ฐานข้อมูล
  password: process.env.DB_PASSWORD, // รหัสผ่านฐานข้อมูล
  server: process.env.DB_HOST, // โฮสต์ของฐานข้อมูล
  port: 1433, // พอร์ตของฐานข้อมูล
  database: process.env.DB_NAME, // ชื่อฐานข้อมูล
  options: {
    encrypt: true, // เข้ารหัสการเชื่อมต่อ
    trustServerCertificate: true, // เชื่อถือใบรับรองเซิร์ฟเวอร์
  },
};

// ฟังก์ชันสำหรับรอการเชื่อมต่อกับฐานข้อมูล SQL Server
const waitForDatabase = async (maxRetries = 10, retryDelay = 5000) => {
  console.log("Waiting for SQL Server to be ready..."); // แสดงข้อความรอการเชื่อมต่อ
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const pool = await sql.connect(config); // พยายามเชื่อมต่อกับฐานข้อมูล
      console.log("Connected to SQL Server!"); // แสดงข้อความเมื่อเชื่อมต่อสำเร็จ
      await pool.close(); // ปิดการเชื่อมต่อ
      return true; // คืนค่า true เมื่อเชื่อมต่อสำเร็จ
    } catch (err) {
      console.error(`Attempt ${attempt} failed: ${err.message}`); // แสดงข้อความเมื่อการเชื่อมต่อล้มเหลว
      if (attempt === maxRetries) {
        throw new Error("SQL Server is not ready after maximum retries."); // ขว้างข้อผิดพลาดเมื่อพยายามเชื่อมต่อครบจำนวนครั้งที่กำหนด
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay)); // รอเวลาที่กำหนดก่อนพยายามเชื่อมต่อใหม่
    }
  }
};

const StartServer = async () => {
  await waitForDatabase();
  // Middleware สำหรับการจัดการ JSON และ static files
  app.use(express.json());
  app.use(express.static("public"));

  // ใช้งาน session
  app.use(
    session({
      secret: "your_secret_key", // คีย์สำหรับเข้ารหัส session
      resave: false,
      saveUninitialized: true,
      cookie: {
        secure: false, // ตั้งเป็น true ถ้าใช้งานผ่าน HTTPS
        httpOnly: true, // ป้องกันการเข้าถึงจาก client-side JavaScript
      },
    })
  );

  // ใช้งาน logger และ error handler
  app.use(loggerMiddleware);
  app.use(errorHandler);

  // Route สำหรับดึง API Key
  app.get("/api/get-api-key", (req, res) => {
    res.json({ apiKey: process.env.API_KEY });
  });

  // Route สำหรับ user routes
  app.use("/api", userRoutes);

  // Route สำหรับการล็อกอิน
  app.get("/index.html", (req, res) => {
    res.sendFile(__dirname + "/index.html");
  });

  app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const apiKey = process.env.API_KEY;

    try {
      // Check in faculty_staff table using university_id as the username
      const pool = await sql.connect(config);
      console.log(username, password);
      const staffResult = await pool
        .request()
        .input("university_id", sql.VarChar, username)
        .input("password", sql.VarChar, password).query(`
  SELECT 
    staff_id, 
    university_id, 
    ISNULL(academic_title, personal_title) AS title, 
    first_name, 
    last_name, 
    email, 
    branch AS department, 
    office AS faculty, 
    role,
    password 
  FROM faculty_staff 
  WHERE university_id = @university_id AND password = @password
`);
      console.log(staffResult.recordset);
      if (staffResult.recordset.length > 0) {
        const staff = staffResult.recordset[0];
        const displayNameEn = `${staff.first_name} ${staff.last_name}`;
        const displayNameTh = `${staff.title || ""} ${staff.first_name} ${
          staff.last_name
        }`.trim();

        // Assign userType and redirectUrl based on role
        let userType = "";
        let redirectUrl = "";

        switch (staff.role) {
          case 1:
            userType = "teacher";
            redirectUrl = "/advisorPetitions";
            break;
          case 2:
            userType = "dean";
            redirectUrl = "/deanPetitions";
            break;
          case 3:
            userType = "staff";
            redirectUrl = "/academicStaffPetitions";
            break;
          default:
            userType = "unknown";
            redirectUrl = "/unknownRole";
            break;
        }

        req.session.user = {
          username: staff.university_id,
          email: staff.email || `${staff.university_id}@example.com`, // Fallback email
          displayname_en: displayNameEn,
          displayname_th: displayNameTh,
          faculty: staff.faculty,
          department: staff.department,
          userType: userType,
        };

        res.json({
          success: true,
          redirectUrl: redirectUrl,
        });
        return;
      }
      // ตรวจสอบ username และ password สำหรับ userType: 'teacher'
      if (username === "0001" && password === "test") {
        req.session.user = {
          username: "0001",
          email: "teacher@example.com", // ตัวอย่างข้อมูล
          displayname_en: "Teacher",
          displayname_th: "ครู",
          faculty: "Faculty of Education",
          department: "Education Department",
          userType: "teacher",
        };

        // ส่ง response กลับไปยัง client โดยให้ redirect ไปที่หน้า hometeacher
        res.json({
          success: true,
          redirectUrl: "/advisorPetitions",
        });
      } else if (username === "0002" && password === "test") {
        req.session.user = {
          username: username,
          email: "academicStaff@example.com", // ตัวอย่างข้อมูล
          displayname_en: "academicStaff",
          displayname_th: "เจ้าหน้าที่ฝ่ายวิชาการ",
          faculty: "Faculty of Education",
          department: "Education Department",
          userType: "academicStaff",
        };

        // ส่ง response กลับไปยัง client โดยให้ redirect ไปที่หน้า homeacademicStaff
        res.json({
          success: true,
          redirectUrl: "/academicStaffPetitions",
        });
      } else if (username === "0004" && password === "test") {
        req.session.user = {
          username: "U004",
          email: "teacher@example.com",
          displayname_en: "Teacher",
          displayname_th: "คณบดี",
          faculty: "Faculty of Education",
          department: "Education Department",
          userType: "teacher",
        };

        // ส่ง response กลับไปยัง client โดยให้ redirect ไปที่หน้า hometeacher
        res.json({
          success: true,
          redirectUrl: "/deanPetitions",
        });
      } else if (username === "0005" && password === "test") {
        req.session.user = {
          username: "U005",
          email: "it@example.com",
          displayname_en: "Teacher",
          displayname_th: "เจ้าหน้าที่เทคนิค",
          faculty: "Faculty of Education",
          department: "Education Department",
          userType: "it",
        };

        // ส่ง response กลับไปยัง client โดยให้ redirect ไปที่หน้า hometeacher
        res.json({
          success: true,
          redirectUrl: "/ITStaffSystemLogs.html",
        });
      } else if (username === "0006" && password === "test") {
        req.session.user = {
          username: "600009",
          email: "it@example.com",
          displayname_en: "Teacher",
          displayname_th: "เจ้าหน้าที่เทคนิค",
          faculty: "Faculty of Education",
          department: "Education Department",
          userType: "it",
        };

        // ส่ง response กลับไปยัง client โดยให้ redirect ไปที่หน้า hometeacher
        res.json({
          success: true,
          redirectUrl: "/advisorPetitions",
        });
      } else if (username === "0007" && password === "test") {
        req.session.user = {
          username: "6609611790",
          email: "it@example.com",
          displayname_en: "chirayu charoenyos",
          displayname_th: "จิรายุ เจริญยศ",
          faculty: "Faculty of Education",
          department: "Education Department",
          userType: "student",
        };
        // ส่ง response กลับไปยัง client โดยให้ redirect ไปที่หน้า homestudent
        res.json({
          success: true,
          redirectUrl: "/draftPetitions",
        });
      } else {
        // ถ้า username และ password ไม่ตรงตามเงื่อนไข ให้เรียก TU API
        const response = await fetch(
          "https://restapi.tu.ac.th/api/v1/auth/Ad/verify",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Application-Key": apiKey,
            },
            body: JSON.stringify({
              UserName: username,
              PassWord: password,
            }),
          }
        );

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
            userType: "student",
          };

          // ส่ง response กลับไปยัง client โดยให้ redirect ไปที่หน้า homestudent
          res.json({
            success: true,
            redirectUrl: "/draftPetitions",
          });
        } else {
          // กรณี API แจ้งว่าข้อมูลไม่ถูกต้อง
          res.json({ success: false, message: data.message });
        }
      }
    } catch (error) {
      console.error("Error connecting to TU API:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to connect to TU API" });
    }
  });

  // Route สำหรับหน้าของนักศึกษา
  app.get("/homestudent", isAuthenticated, isStudent, (req, res) => {
    res.sendFile(path.join(__dirname, "views", "homestudent.html"));
  });

  // Route สำหรับหน้าของอาจารย์
  app.get("/hometeacher", isAuthenticated, isTeacher, (req, res) => {
    res.sendFile(path.join(__dirname, "views", "hometeacher.html"));
  });

  // Route สำหรับหน้าของเจ้าหน้าที่ฝ่ายวิชาการ
  app.get(
    "/homeacademicStaff",
    isAuthenticated,
    isAcademicStaff,
    (req, res) => {
      res.sendFile(path.join(__dirname, "views", "homeacademicStaff.html"));
    }
  );

  // Route สำหรับดึงข้อมูล session
  app.get("/get-session-data", (req, res) => {
    if (req.session.user) {
      res.json({
        student_id: req.session.user.username,
        student_name: req.session.user.displayname_th,
        department: req.session.user.department,
      });
    } else {
      res.json({
        student_id: "",
        student_name: "",
        department: "",
      });
    }
  });

  // Endpoint สำหรับอัปเดตสถานะเป็น "อ่านแล้ว" และตั้งค่า review_time
  app.post("/advisor/auto-update-status/:id", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
      const pool = await sql.connect(config);
      await pool
        .request()
        .input("id", sql.Int, id)
        .input("status", sql.TinyInt, status).query(`
                UPDATE petition 
                SET status = @status, review_time_b = GETDATE()
                WHERE petition_id = @id
            `);

      res.json({ success: true });
    } catch (err) {
      console.error("Error updating petition status and review time:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to update petition status" });
    }
  });

  // Endpoint สำหรับอัปเดตสถานะคำร้องพร้อมอัปเดต review_time
  app.post("/advisor/update-petition/:id", async (req, res) => {
    const { id } = req.params;
    const { status, comment } = req.body;

    // Log incoming data for debugging
    console.log("Incoming Request:", { id, status, comment });

    // Validate input data
    if (
      !id ||
      status === undefined ||
      (status !== 20 && comment === undefined)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    try {
      const pool = await sql.connect(config);

      // Update the petition's status and comment
      const result = await pool
        .request()
        .input("id", sql.Int, id)
        .input("comment", sql.NVarChar, comment)
        .input("status", sql.TinyInt, status).query(`
          UPDATE petition
          SET status = @status,
              comment_b = @comment, 
              review_time_b = GETDATE()
          WHERE petition_id = @id;
        `);

      // Check if a row was affected
      if (result.rowsAffected[0] === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Petition not found" });
      }

      res.json({ success: true, message: "Petition updated successfully" });
    } catch (err) {
      console.error("Error updating petition status and review time:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to update petition status" });
    }
  });

  // Endpoint สำหรับดึงข้อมูล student_name และ student_id จากเซสชัน
  app.get("/api/session-student-info", (req, res) => {
    if (req.session.user) {
      res.json({
        student_name: req.session.user.displayname_th,
        student_id: req.session.user.username,
      });
    } else {
      res.status(401).json({ error: "User not logged in" });
    }
  });

  // Route สำหรับ submit คำร้อง
  // การตั้งค่า multer สำหรับอัปโหลดไฟล์
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/"); // โฟลเดอร์สำหรับเก็บไฟล์ที่อัปโหลด
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname));
    },
  });

  const upload = multer({ storage: storage });

  // Endpoint for submitting a new petition with files
  // Endpoint สำหรับ submit คำร้องใหม่พร้อมไฟล์แนบและเหตุผลในการยื่นคำร้อง
  app.post(
    "/submit-petition",
    upload.fields([
      { name: "attachFile01", maxCount: 1 },
      { name: "attachFile02", maxCount: 1 },
    ]),
    async (req, res) => {
      const {
        student_id,
        student_name,
        major,
        year,
        house_number,
        moo,
        sub_district,
        district,
        province,
        postcode,
        student_phone,
        guardian_phone,
        petition_type,
        semester,
        subject_code,
        subject_name,
        section,
        status,
        reason,
      } = req.body;
      const files = req.files;

      let transaction;
      try {
        const pool = await sql.connect(config);

        // Start a transaction to ensure data integrity
        transaction = new sql.Transaction(pool);

        await transaction.begin();

        // Insert the petition into the database and get the new petition_id
        const petitionRequest = new sql.Request(transaction);
        petitionRequest.input("student_id", sql.NVarChar, student_id);
        petitionRequest.input("student_name", sql.NVarChar, student_name);
        petitionRequest.input("major", sql.NVarChar, major);
        petitionRequest.input("year", sql.Int, year);
        petitionRequest.input("house_number", sql.NVarChar, house_number);
        petitionRequest.input("moo", sql.NVarChar, moo);
        petitionRequest.input("sub_district", sql.NVarChar, sub_district);
        petitionRequest.input("district", sql.NVarChar, district);
        petitionRequest.input("province", sql.NVarChar, province);
        petitionRequest.input("postcode", sql.NVarChar, postcode);
        petitionRequest.input("student_phone", sql.NVarChar, student_phone);
        petitionRequest.input("guardian_phone", sql.NVarChar, guardian_phone);
        petitionRequest.input("petition_type", sql.NVarChar, petition_type);
        petitionRequest.input("semester", sql.NVarChar, semester);
        petitionRequest.input("subject_code", sql.NVarChar, subject_code);
        petitionRequest.input("subject_name", sql.NVarChar, subject_name);
        petitionRequest.input("section", sql.NVarChar, section);
        petitionRequest.input("status", sql.TinyInt, status);
        petitionRequest.input("reason", sql.NVarChar, reason || ""); // Default to an empty string if reason is not provided

        const petitionResult = await petitionRequest.query(`
            INSERT INTO petition (
                student_id, student_name, major, year, house_number, moo, sub_district, district,
                province, postcode, student_phone, guardian_phone, petition_type, semester,
                subject_code, subject_name, section, status, reason
            )
            VALUES (
                @student_id, @student_name, @major, @year, @house_number, @moo, @sub_district, @district,
                @province, @postcode, @student_phone, @guardian_phone, @petition_type, @semester,
                @subject_code, @subject_name, @section, @status, @reason
            );
            SELECT SCOPE_IDENTITY() AS petition_id;
        `);

        const petitionId = petitionResult.recordset[0].petition_id;

        // Insert uploaded files into localdoc table
        if (files && files.attachFile01) {
          const file1 = files.attachFile01[0];
          const fileRequest1 = new sql.Request(transaction);
          fileRequest1.input("petition_id", sql.Int, petitionId);
          fileRequest1.input("file_type", sql.NVarChar, file1.mimetype);
          fileRequest1.input("file_name", sql.NVarChar, file1.originalname);
          fileRequest1.input(
            "file_description",
            sql.NVarChar,
            req.body.fileDescription1 || "" // Unique parameter name
          );
          fileRequest1.input("file_path", sql.NVarChar, file1.path);

          await fileRequest1.query(`
                INSERT INTO localdoc (petition_id, file_type, file_name, description, file_path)
                VALUES (@petition_id, @file_type, @file_name, @file_description, @file_path)
            `);
        }

        if (files && files.attachFile02) {
          const file2 = files.attachFile02[0];
          const fileRequest2 = new sql.Request(transaction);
          fileRequest2.input("petition_id", sql.Int, petitionId);
          fileRequest2.input("file_type", sql.NVarChar, file2.mimetype);
          fileRequest2.input("file_name", sql.NVarChar, file2.originalname);
          fileRequest2.input(
            "file_description",
            sql.NVarChar,
            req.body.fileDescription2 || "" // Unique parameter name
          );
          fileRequest2.input("file_path", sql.NVarChar, file2.path);

          await fileRequest2.query(`
                INSERT INTO localdoc (petition_id, file_type, file_name, description, file_path)
                VALUES (@petition_id, @file_type, @file_name, @file_description, @file_path)
            `);
        }

        // Commit the transaction
        await transaction.commit();

        res.json({
          success: true,
          message: "Petition submitted successfully with files.",
        });
      } catch (error) {
        console.error("Error saving petition:", error);

        // Rollback the transaction in case of error
        if (transaction) await transaction.rollback();

        res
          .status(500)
          .json({ success: false, message: "Error saving petition" });
      }
    }
  );

  // Endpoint สำหรับอัปเดตคำร้องพร้อมกับไฟล์แนบใหม่และเหตุผลในการยื่นคำร้อง
  // Endpoint สำหรับอัปเดตคำร้องพร้อมกับไฟล์แนบใหม่และเหตุผลในการยื่นคำร้อง
  app.put(
    "/update-petition/:id",
    upload.fields([
      { name: "attachFile01", maxCount: 1 },
      { name: "attachFile02", maxCount: 1 },
    ]),
    async (req, res) => {
      const { id } = req.params;
      const {
        student_id,
        student_name,
        major,
        year,
        house_number,
        moo,
        sub_district,
        district,
        province,
        postcode,
        student_phone,
        guardian_phone,
        petition_type,
        semester,
        subject_code,
        subject_name,
        section,
        status,
        reason,
      } = req.body;

      const removedFiles = JSON.parse(req.body.removedFiles || "[]");
      const files = req.files;

      if (!student_id) {
        return res
          .status(400)
          .json({ success: false, message: "student_id is required" });
      }

      try {
        const pool = await sql.connect(config);

        // Update the petition in the database
        await pool
          .request()
          .input("id", sql.Int, id)
          .input("student_id", sql.NVarChar, student_id)
          .input("student_name", sql.NVarChar, student_name || "")
          .input("major", sql.NVarChar, major || "")
          .input("year", sql.Int, year || 0)
          .input("house_number", sql.NVarChar, house_number || "")
          .input("moo", sql.NVarChar, moo || "")
          .input("sub_district", sql.NVarChar, sub_district || "")
          .input("district", sql.NVarChar, district || "")
          .input("province", sql.NVarChar, province || "")
          .input("postcode", sql.NVarChar, postcode || "")
          .input("student_phone", sql.NVarChar, student_phone || "")
          .input("guardian_phone", sql.NVarChar, guardian_phone || "")
          .input("petition_type", sql.NVarChar, petition_type || "")
          .input("semester", sql.NVarChar, semester || "")
          .input("subject_code", sql.NVarChar, subject_code || "")
          .input("subject_name", sql.NVarChar, subject_name || "")
          .input("section", sql.NVarChar, section || "")
          .input("status", sql.TinyInt, status || 0)
          .input("reason", sql.NVarChar, reason || "") // เพิ่ม reason
          .query(`
                UPDATE petition SET
                    student_id = @student_id,
                    student_name = @student_name,
                    major = @major,
                    year = @year,
                    house_number = @house_number,
                    moo = @moo,
                    sub_district = @sub_district,
                    district = @district,
                    province = @province,
                    postcode = @postcode,
                    student_phone = @student_phone,
                    guardian_phone = @guardian_phone,
                    petition_type = @petition_type,
                    semester = @semester,
                    subject_code = @subject_code,
                    subject_name = @subject_name,
                    section = @section,
                    status = @status,
                    reason = @reason,
                    submit_time = GETDATE() -- อัปเดตเวลาส่งคำร้องเป็นเวลาปัจจุบัน
                WHERE petition_id = @id
            `);

        const existingFilesResult = await pool
          .request()
          .input("petitionId", sql.Int, id)
          .query(
            "SELECT file_id, file_name, description FROM localdoc WHERE petition_id = @petitionId"
          );

        const existingFiles = existingFilesResult.recordset;

        // อัปเดตคำอธิบายไฟล์ที่มีอยู่
        for (const file of existingFiles) {
          const fileNumber = existingFiles.indexOf(file) + 1; // คำนวณหมายเลขไฟล์ (1 หรือ 2)
          const descriptionFieldName = `fileDescription${fileNumber}`;
          const newDescription = req.body[descriptionFieldName];

          if (
            newDescription !== undefined &&
            newDescription !== file.description
          ) {
            // อัปเดตคำอธิบายไฟล์ในฐานข้อมูล
            await pool
              .request()
              .input("fileId", sql.Int, file.file_id)
              .input("description", sql.NVarChar, newDescription)
              .query(
                "UPDATE localdoc SET description = @description WHERE file_id = @fileId"
              );
          }
        }

        // Handle removed files
        for (const fileId of removedFiles) {
          const fileResult = await pool
            .request()
            .input("fileId", sql.Int, fileId)
            .query("SELECT file_path FROM localdoc WHERE file_id = @fileId");

          const file = fileResult.recordset[0];
          if (file) {
            await pool
              .request()
              .input("fileId", sql.Int, fileId)
              .query("DELETE FROM localdoc WHERE file_id = @fileId");

            fs.unlinkSync(path.resolve(file.file_path));
          }
        }

        // Handle new file uploads
        if (files && files.attachFile01) {
          const file1 = files.attachFile01[0];
          await pool
            .request()
            .input("petition_id", sql.Int, id)
            .input("file_type", sql.NVarChar, file1.mimetype)
            .input("file_name", sql.NVarChar, file1.originalname)
            .input("description", sql.NVarChar, req.body.fileDescription1 || "")
            .input("file_path", sql.NVarChar, file1.path).query(`
                    INSERT INTO localdoc (petition_id, file_type, file_name, description, file_path)
                    VALUES (@petition_id, @file_type, @file_name, @description, @file_path)
                `);
        }

        if (files && files.attachFile02) {
          const file2 = files.attachFile02[0];
          await pool
            .request()
            .input("petition_id", sql.Int, id)
            .input("file_type", sql.NVarChar, file2.mimetype)
            .input("file_name", sql.NVarChar, file2.originalname)
            .input("description", sql.NVarChar, req.body.fileDescription2 || "")
            .input("file_path", sql.NVarChar, file2.path).query(`
                    INSERT INTO localdoc (petition_id, file_type, file_name, description, file_path)
                    VALUES (@petition_id, @file_type, @file_name, @description, @file_path)
                `);
        }

        res.json({ success: true });
      } catch (err) {
        console.error("Error updating petition:", err);
        res
          .status(500)
          .json({ success: false, message: "Failed to update petition" });
      }
    }
  );

  // Route สำหรับดึง draft petitions
  app.get("/draft-petitions", isAuthenticated, isStudent, async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const student_id = req.session.user.username;
    const query = `
        SELECT petition_id, student_id, student_name, major, year, house_number, moo, 
               sub_district, district, province, postcode, student_phone, 
               guardian_phone, petition_type, semester, subject_code, 
               subject_name, section, status, submit_time
        FROM petition
        WHERE student_id = @student_id AND status = 1
    `;

    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .input("student_id", sql.NVarChar, student_id)
        .query(query);

      res.json(result.recordset);
    } catch (error) {
      console.error("Error fetching draft petitions:", error);
      res.status(500).json({ error: "Failed to fetch draft petitions" });
    }
  });

  // Route สำหรับแสดงหน้า draft petitions
  app.get("/draft-petitions-page", isAuthenticated, isStudent, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "draftPetitions.html"));
  });

  // Endpoint สำหรับอัปเดตข้อมูลที่ปรึกษา
  app.post("/update-advisor", async (req, res) => {
    const { student_id, advisor_id } = req.body;

    if (!student_id || !advisor_id) {
      return res
        .status(400)
        .json({ message: "Student ID and Advisor ID are required." });
    }

    try {
      const pool = await sql.connect(config);
      const query = `
            INSERT INTO advisor_info (student_id, advisor_id) 
            VALUES (@student_id, @advisor_id)
        `;

      await pool
        .request()
        .input("student_id", sql.NVarChar, student_id)
        .input("advisor_id", sql.NVarChar, advisor_id)
        .query(query);

      res.json({ message: "Advisor updated successfully." });
    } catch (error) {
      console.error("Error updating advisor:", error);
      res.status(500).json({ message: "Error updating advisor information." });
    } finally {
      sql.close();
    }
  });

  //เจ้าหน้าที่วิชาการ
  // Endpoint สำหรับอัปเดตสถานะเป็น "อ่านแล้ว" และตั้งค่า review_time
  app.post(
    "/academicStaff/auto-update-status/:id",
    isAuthenticated,
    isAcademicStaff,
    async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      try {
        const pool = await sql.connect(config);

        await pool
          .request()
          .input("id", sql.Int, id)
          .input("status", sql.TinyInt, status).query(`
            UPDATE petition 
            SET status = @status, review_time_a = GETDATE()
            WHERE petition_id = @id
          `);

        res.json({ success: true, message: "Status updated successfully." });
      } catch (err) {
        console.error("Error updating petition status:", err);
        res.status(500).json({ error: "Failed to update petition status" });
      }
    }
  );

  app.post(
    "/academicStaff/update-petition/:id",
    isAuthenticated,
    isAcademicStaff,
    async (req, res) => {
      const { id } = req.params;
      const { status, comment } = req.body;

      try {
        const pool = await sql.connect(config);

        await pool
          .request()
          .input("id", sql.Int, id)
          .input("status", sql.TinyInt, status)
          .input("comment", sql.NVarChar, comment || "").query(`
          UPDATE petition
          SET status = @status, 
              review_time_a = GETDATE(), 
              comment_a = @comment
          WHERE petition_id = @id
        `);

        res.json({
          success: true,
          message: "Petition status updated successfully.",
        });
      } catch (err) {
        console.error("Error updating petition status:", err);
        res.status(500).json({ error: "Failed to update petition status" });
      }
    }
  );

  app.get(
    "/academicStaff/pending-petitions",
    isAuthenticated,
    isAcademicStaff,
    async (req, res) => {
      try {
        const pool = await sql.connect(config);

        // Query ดึงคำร้องที่ status = 2
        const pendingResult = await pool.request().query(`
          SELECT *
          FROM petition
          WHERE status = 2
        `);

        res.json(pendingResult.recordset); // ส่งคำร้องทั้งหมดที่ต้องตรวจสอบไปยัง client
      } catch (err) {
        console.error("Error fetching pending petitions:", err);
        res.status(500).json({ error: "Failed to fetch pending petitions" });
      }
    }
  );

  app.get(
    "/academicStaff/reviewed-petitions",
    isAuthenticated,
    isAcademicStaff,
    async (req, res) => {
      try {
        const pool = await sql.connect(config);

        const reviewedResult = await pool.query(`
        SELECT * FROM petition WHERE status IN (3, 4) 
      `); //ไม่รู้ว่าควรมองเห็นแค่ไหน

        res.json(reviewedResult.recordset); // ส่งคำร้องที่ตรวจสอบแล้ว
      } catch (err) {
        console.error("Error fetching reviewed petitions:", err);
        res.status(500).json({ error: "Failed to fetch reviewed petitions" });
      }
    }
  );

  app.get(
    "/academicStaff/petition-details/:id",
    isAuthenticated,
    isAcademicStaff,
    async (req, res) => {
      const { id } = req.params;

      try {
        const pool = await sql.connect(config);

        // ดึงข้อมูลคำร้อง
        const petitionResult = await pool.request().input("id", sql.Int, id)
          .query(`
          SELECT * FROM petition WHERE petition_id = @id
        `);

        const petition = petitionResult.recordset[0];

        if (!petition) {
          return res.status(404).json({ error: "Petition not found" });
        }

        // ดึงข้อมูลไฟล์แนบ
        const filesResult = await pool
          .request()
          .input("petition_id", sql.Int, id).query(`
          SELECT file_id, file_name, description
          FROM localdoc
          WHERE petition_id = @petition_id
        `);

        petition.attachedFiles = filesResult.recordset;

        res.json(petition);
      } catch (err) {
        console.error("Error fetching petition details:", err);
        res.status(500).json({ error: "Failed to fetch petition details" });
      }
    }
  );

  // Routes for academicStaffForCommittee

  app.post(
    "/academicStaffForCommittee/update-petition/:id",
    isAuthenticated,
    isAcademicStaff,
    async (req, res) => {
      const { id } = req.params;
      const { status, comment } = req.body;

      try {
        const pool = await sql.connect(config);

        await pool
          .request()
          .input("id", sql.Int, id)
          .input("status", sql.TinyInt, status)
          .input("comment", sql.NVarChar, comment || "").query(`
        UPDATE petition
        SET status = @status, 
            review_time_d = GETDATE(), 
            comment_d = @comment
        WHERE petition_id = @id
      `);

        res.json({
          success: true,
          message: "Petition status updated successfully.",
        });
      } catch (err) {
        console.error("Error updating petition status:", err);
        res.status(500).json({ error: "Failed to update petition status" });
      }
    }
  );

  app.get(
    "/academicStaffForCommittee/pending-petitions",
    isAuthenticated,
    isAcademicStaff,
    async (req, res) => {
      try {
        const pool = await sql.connect(config);

        // Query ดึงคำร้องที่ status = 9และ 14
        const pendingResult = await pool.request().query(`
        SELECT *
        FROM petition
        WHERE status IN (9, 14)
      `);

        res.json(pendingResult.recordset); // ส่งคำร้องทั้งหมดที่ต้องตรวจสอบไปยัง client
      } catch (err) {
        console.error("Error fetching pending petitions:", err);
        res.status(500).json({ error: "Failed to fetch pending petitions" });
      }
    }
  );

  app.get(
    "/academicStaffForCommittee/reviewed-petitions",
    isAuthenticated,
    isAcademicStaff,
    async (req, res) => {
      try {
        const pool = await sql.connect(config);

        const reviewedResult = await pool.query(`
      SELECT * FROM petition WHERE status IN (11, 12) 
    `); //ไม่รู้ว่าควรมองเห็นแค่ไหน

        res.json(reviewedResult.recordset); // ส่งคำร้องที่ตรวจสอบแล้ว
      } catch (err) {
        console.error("Error fetching reviewed petitions:", err);
        res.status(500).json({ error: "Failed to fetch reviewed petitions" });
      }
    }
  );

  app.get(
    "/academicStaffForCommittee/petition-details/:id",
    isAuthenticated,
    isAcademicStaff,
    async (req, res) => {
      const { id } = req.params;

      try {
        const pool = await sql.connect(config);

        // ดึงข้อมูลคำร้อง
        const petitionResult = await pool.request().input("id", sql.Int, id)
          .query(`
        SELECT * FROM petition WHERE petition_id = @id
      `);

        const petition = petitionResult.recordset[0];

        if (!petition) {
          return res.status(404).json({ error: "Petition not found" });
        }

        // ดึงข้อมูลไฟล์แนบ
        const filesResult = await pool
          .request()
          .input("petition_id", sql.Int, id).query(`
        SELECT file_id, file_name, description
        FROM localdoc
        WHERE petition_id = @petition_id
      `);

        petition.attachedFiles = filesResult.recordset;

        res.json(petition);
      } catch (err) {
        console.error("Error fetching petition details:", err);
        res.status(500).json({ error: "Failed to fetch petition details" });
      }
    }
  );

  //สำหรับacademicStaffFinalStage
  app.post(
    "/academicStaffFinalStage/update-petition/:id",
    isAuthenticated,
    isAcademicStaff,
    async (req, res) => {
      const { id } = req.params;
      const { status, comment } = req.body;

      try {
        const pool = await sql.connect(config);

        await pool
          .request()
          .input("id", sql.Int, id)
          .input("status", sql.TinyInt, status)
          .input("comment", sql.NVarChar, comment || "").query(`
          UPDATE petition
          SET status = @status, 
              review_time_d = GETDATE(), 
              comment_d = @comment
          WHERE petition_id = @id
        `);

        res.json({
          success: true,
          message: "Petition status updated successfully.",
        });
      } catch (err) {
        console.error("Error updating petition status:", err);
        res.status(500).json({ error: "Failed to update petition status" });
      }
    }
  );

  app.get(
    "/academicStaffFinalStage/pending-petitions",
    isAuthenticated,
    isAcademicStaff,
    async (req, res) => {
      try {
        const pool = await sql.connect(config);

        // Query ดึงคำร้องที่ status = 9และ 14
        const pendingResult = await pool.request().query(`
          SELECT *
          FROM petition
          WHERE status = 13
        `);

        res.json(pendingResult.recordset); // ส่งคำร้องทั้งหมดที่ต้องตรวจสอบไปยัง client
      } catch (err) {
        console.error("Error fetching pending petitions:", err);
        res.status(500).json({ error: "Failed to fetch pending petitions" });
      }
    }
  );

  app.get(
    "/academicStaffFinalStage/reviewed-petitions",
    isAuthenticated,
    isAcademicStaff,
    async (req, res) => {
      try {
        const pool = await sql.connect(config);

        const reviewedResult = await pool.query(`
        SELECT * FROM petition WHERE status = 15
      `); //ไม่รู้ว่าควรมองเห็นแค่ไหน

        res.json(reviewedResult.recordset); // ส่งคำร้องที่ตรวจสอบแล้ว
      } catch (err) {
        console.error("Error fetching reviewed petitions:", err);
        res.status(500).json({ error: "Failed to fetch reviewed petitions" });
      }
    }
  );

  app.get(
    "/academicStaffFinalStage/petition-details/:id",
    isAuthenticated,
    isAcademicStaff,
    async (req, res) => {
      const { id } = req.params;

      try {
        const pool = await sql.connect(config);

        // ดึงข้อมูลคำร้อง
        const petitionResult = await pool.request().input("id", sql.Int, id)
          .query(`
          SELECT * FROM petition WHERE petition_id = @id
        `);

        const petition = petitionResult.recordset[0];

        if (!petition) {
          return res.status(404).json({ error: "Petition not found" });
        }

        // ดึงข้อมูลไฟล์แนบ
        const filesResult = await pool
          .request()
          .input("petition_id", sql.Int, id).query(`
          SELECT file_id, file_name, description
          FROM localdoc
          WHERE petition_id = @petition_id
        `);

        petition.attachedFiles = filesResult.recordset;

        res.json(petition);
      } catch (err) {
        console.error("Error fetching petition details:", err);
        res.status(500).json({ error: "Failed to fetch petition details" });
      }
    }
  );

  // Route สำหรับแสดงคำร้องของอาจารย์
  app.get(
    "/advisor-petitions",
    isAuthenticated,
    isTeacher,
    async (req, res) => {
      const advisorId = req.session.user?.username; // ใช้รหัสอาจารย์จาก session

      if (!advisorId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const query = `
            SELECT p.*
            FROM petition p
            JOIN advisor_info a ON p.student_id = a.student_id
            WHERE a.advisor_id = @advisorId AND p.status = 3
        `;

        const pool = await sql.connect(config);
        const result = await pool
          .request()
          .input("advisorId", sql.NVarChar, advisorId)
          .query(query);

        res.json(result.recordset); // ส่งข้อมูลคำร้องไปยัง client
      } catch (error) {
        console.error("Error fetching petitions:", error);
        res.status(500).json({ error: "Failed to fetch petitions" });
      }
    }
  );

  // ดึงข้อมูลคำร้องที่ยังไม่ได้ตรวจสอบและตรวจสอบแล้ว
  app.get(
    "/advisor/pending-petitions",
    isAuthenticated,
    isTeacher,
    async (req, res) => {
      try {
        const advisorId = req.session.user.username;
        const pool = await sql.connect(config);

        const pendingResult = await pool
          .request()
          .input("advisorId", sql.NVarChar, advisorId)
          .query(`SELECT * FROM petition WHERE status = 3 AND student_id IN 
                    (SELECT student_id FROM advisor_info WHERE advisor_id = @advisorId)`);

        const reviewedResult = await pool
          .request()
          .input("advisorId", sql.NVarChar, advisorId)
          .query(`SELECT * FROM petition WHERE status IN (5, 6, 7) AND student_id IN 
                    (SELECT student_id FROM advisor_info WHERE advisor_id = @advisorId)`);

        res.json({
          pending: pendingResult.recordset,
          reviewed: reviewedResult.recordset,
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch petitions" });
      }
    }
  );

  // เส้นทางสำหรับ '/advisor/petition/:id'
  app.get("/advisor/petition", isAuthenticated, isTeacher, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "advisorPetitionDetail.html"));
  });

  app.use(express.static(path.join(__dirname, "public")));

  app.get("/advisor/petition-details/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const pool = await sql.connect(config);

      // ดึงข้อมูลคำร้อง
      const petitionResult = await pool
        .request()
        .input("id", sql.Int, id)
        .query("SELECT * FROM petition WHERE petition_id = @id");

      const petition = petitionResult.recordset[0];

      if (!petition) {
        return res.status(404).json({ error: "Petition not found" });
      }

      // ดึงข้อมูลไฟล์แนบจากตาราง localdoc
      const filesResult = await pool
        .request()
        .input("petition_id", sql.Int, id)
        .query(
          "SELECT file_id, file_name, description FROM localdoc WHERE petition_id = @petition_id"
        );

      petition.attachedFiles = filesResult.recordset;

      res.json(petition);
    } catch (err) {
      console.error("Error fetching petition details:", err);
      res.status(500).json({ error: "Failed to fetch petition details" });
    }
  });
  // เข้าใจว่า copyมาเกิน เพราะไม่ถูกเรียกใช้
  // app.post("/advisor/update-petition/:id", async (req, res) => {
  //   const { id } = req.params;
  //   const { status, comment } = req.body;
  //   try {
  //     const pool = await sql.connect(config);
  //     console.log("hit 2");
  //     await pool
  //       .request()
  //       .input("id", sql.Int, id)
  //       .input("comment", sql.NVarChar, comment)
  //       .input("status", sql.TinyInt, status)
  //       .query(
  //         `UPDATE petition
  //         SET status = @status,
  //             comment_b = @comment,
  //             review_time_b = GETDATE()
  //         WHERE petition_id = @id;`
  //       );

  //     res.json({ success: true });
  //   } catch (err) {
  //     console.error(err);
  //     res
  //       .status(500)
  //       .json({ success: false, error: "Failed to update petition status" });
  //   }
  // });

  //route สำหรับคำร้องของอาจารย์ในรายวิชา
  // ดึงข้อมูลคำร้องในรายวิชาที่ยังไม่ได้ตรวจสอบและตรวจสอบแล้ว
  app.get("/teacher/pending-petitions", async (req, res) => {
    try {
      const teacherId = req.session.user.username; // e.g., 'U001' req.session.user.username
      const pool = await sql.connect(config);

      // Pending petitions with status = 6
      const pendingResult = await pool
        .request()
        .input("teacherId", sql.NVarChar, teacherId).query(`
            SELECT p.*
            FROM petition p
            INNER JOIN courses c ON p.subject_code = c.course_code
            CROSS APPLY OPENJSON(c.sections)
            WITH (
              staff_id INT '$.staff_id',
              section NVARCHAR(50) '$.section'
            ) AS s
            INNER JOIN faculty_staff fs ON s.staff_id = fs.staff_id
            WHERE p.status = 6
              AND fs.university_id = @teacherId
              AND s.section = p.section
          `);

      // Reviewed petitions with status IN (8, 9, 10)
      const reviewedResult = await pool
        .request()
        .input("teacherId", sql.NVarChar, teacherId).query(`
            SELECT p.*
            FROM petition p
            INNER JOIN courses c ON p.subject_code = c.course_code
            CROSS APPLY OPENJSON(c.sections)
            WITH (
              staff_id INT '$.staff_id',
              section NVARCHAR(50) '$.section'
            ) AS s
            INNER JOIN faculty_staff fs ON s.staff_id = fs.staff_id
            WHERE p.status IN (8, 9, 10)
              AND fs.university_id = @teacherId
              AND s.section = p.section
          `);

      res.json({
        pending: pendingResult.recordset,
        reviewed: reviewedResult.recordset,
      });
    } catch (err) {
      console.error("Error:", err);
      res.status(500).json({ error: "Failed to fetch petitions" });
    }
  });

  app.get("/teacher/petition-details/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const pool = await sql.connect(config);

      // Fetch the petition by ID
      const petitionResult = await pool.request().input("id", sql.Int, id)
        .query(`
          SELECT * 
          FROM petition
          WHERE petition_id = @id;
        `);

      const petition = petitionResult.recordset[0];

      if (!petition) {
        return res.status(404).json({ error: "Petition not found" });
      }

      // Optionally, fetch attached files for the petition
      const filesResult = await pool.request().input("petition_id", sql.Int, id)
        .query(`
          SELECT file_id, file_name, description
          FROM localdoc
          WHERE petition_id = @petition_id;
        `);

      petition.attachedFiles = filesResult.recordset;

      // Return the petition with any attached files
      res.json(petition);
    } catch (err) {
      console.error("Error fetching petition details:", err);
      res.status(500).json({ error: "Failed to fetch petition details" });
    }
  });

  app.post("/teacher/update-petition/:id", async (req, res) => {
    const { id } = req.params;
    const { status, comment } = req.body;

    // Validate input
    if (!id || status === undefined || comment === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const pool = await sql.connect(config);

      // Update the petition's status and comment
      const result = await pool
        .request()
        .input("id", sql.Int, id)
        .input("comment", sql.NVarChar, comment)
        .input("status", sql.TinyInt, status).query(`
          UPDATE petition
          SET status = @status,
              comment_c = @comment,
              review_time_c = GETDATE()
          WHERE petition_id = @id;
        `);

      // Check if a row was affected
      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ error: "Petition not found" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error updating petition status:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to update petition status" });
    }
  });

  app.post("/teacher/auto-update-status/:id", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
      const pool = await sql.connect(config);
      await pool
        .request()
        .input("id", sql.Int, id)
        .input("status", sql.TinyInt, status).query(`
                UPDATE petition 
                SET status = @status, review_time_c = GETDATE()
                WHERE petition_id = @id
            `);

      res.json({ success: true });
    } catch (err) {
      console.error("Error updating petition status and review time:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to update petition status" });
    }
  });

  // route สำหรับคณบดี
  app.get("/dean/pending-petitions", async (req, res) => {
    try {
      const deanId = req.session.user.username; // e.g., 'U001'
      const pool = await sql.connect(config);

      // Fetch pending petitions with status = 11
      const pendingPetitions = await pool
        .request()
        .input("deanId", sql.NVarChar, deanId) // Dean ID input if needed
        .query(`
          SELECT p.*
          FROM petition p
          WHERE p.status = 11
        `);
      // Fetch reviewed petitions with status IN (12, 13)
      const reviewedPetitions = await pool
        .request()
        .input("deanId", sql.NVarChar, deanId) // Dean ID input if needed
        .query(`
          SELECT p.*
          FROM petition p
          WHERE p.status IN (13, 14)
        `);

      res.json({
        pendingPetitions: pendingPetitions.recordset,
        reviewedPetitions: reviewedPetitions.recordset,
      });
    } catch (err) {
      console.error("Error fetching petitions:", err);
      res.status(500).json({ error: "Failed to fetch petitions" });
    }
  });
  app.get("/dean/petition-details/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const pool = await sql.connect(config);

      // Fetch the petition by ID
      const petitionResult = await pool.request().input("id", sql.Int, id)
        .query(`
          SELECT * 
          FROM petition
          WHERE petition_id = @id;
        `);

      const petition = petitionResult.recordset[0];

      if (!petition) {
        return res.status(404).json({ error: "Petition not found" });
      }

      // Optionally, fetch attached files for the petition
      const filesResult = await pool.request().input("petition_id", sql.Int, id)
        .query(`
          SELECT file_id, file_name, description
          FROM localdoc
          WHERE petition_id = @petition_id;
        `);

      petition.attachedFiles = filesResult.recordset;

      // Return the petition with any attached files
      res.json(petition);
    } catch (err) {
      console.error("Error fetching petition details:", err);
      res.status(500).json({ error: "Failed to fetch petition details" });
    }
  });

  app.post("/dean/update-petition/:id", async (req, res) => {
    const { id } = req.params;
    const { status, comment } = req.body;

    try {
      const pool = await sql.connect(config);

      // Update the petition's status
      const result = await pool
        .request()
        .input("id", sql.Int, id)
        .input("comment", sql.NVarChar, comment)
        .input("status", sql.TinyInt, status).query(`
          UPDATE petition
          SET status = @status,
              comment_e = @comment,
              review_time_e = GETDATE()
          WHERE petition_id = @id;
        `);

      // Check if a row was affected
      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ error: "Petition not found" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error updating petition status:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to update petition status" });
    }
  });

  // ใน server.js
  app.get("/advisorPetitions", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "advisorPetitions.html"));
  });

  app.get("/studentPetitions", isAuthenticated, isStudent, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "studentPetitions.html"));
  });

  app.get("/draftPetitions", isAuthenticated, isStudent, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "draftPetitions.html"));
  });

  app.get("/advisorPetitions", isAuthenticated, isTeacher, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "advisorPetitions.html"));
  });

  app.get(
    "/academicStaffPetitions",
    isAuthenticated,
    isAcademicStaff,
    (req, res) => {
      res.sendFile(
        path.join(__dirname, "public", "academicStaffPetitions.html")
      );
    }
  );

  app.get(
    "/academicStaffForCommitteePetitions",
    isAuthenticated,
    isAcademicStaff,
    (req, res) => {
      res.sendFile(
        path.join(
          __dirname,
          "public",
          "academicStaffForCommitteePetitions.html"
        )
      );
    }
  );

  app.get(
    "/academicStaffForCommitteePetitionDetail.html",
    isAuthenticated,
    isAcademicStaff,
    (req, res) => {
      res.sendFile(
        path.join(
          __dirname,
          "public",
          "academicStaffForCommitteePetitionDetail.html"
        )
      );
    }
  );
  app.get(
    "/academicStaffFinalStagePetitions",
    isAuthenticated,
    isAcademicStaff,
    (req, res) => {
      res.sendFile(
        path.join(__dirname, "public", "academicStaffFinalStagePetitions.html")
      );
    }
  );

  app.get("/teacherPetitions", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "teacherPetitions.html"));
  });
  app.get("/teacherAppointment", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "teacherAppointment.html"));
  });
  app.get("/deanPetitions", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "deanPetitions.html"));
  });

  // Fetch petitions for the logged-in student
  app.get(
    "/student/petitions",
    isAuthenticated,
    isStudent,
    async (req, res) => {
      try {
        const studentId = req.session.user.username;
        const pool = await sql.connect(config);
        const result = await pool
          .request()
          .input("studentId", sql.NVarChar, studentId)
          .query(
            "SELECT * FROM petition WHERE student_id = @studentId AND status IN (2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22)"
          );

        res.json(result.recordset);
      } catch (err) {
        console.error("Error fetching petitions:", err);
        res.status(500).json({ error: "Failed to fetch petitions" });
      }
    }
  );

  // Fetch details of a specific petition
  app.get("/student/petition-details/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const pool = await sql.connect(config);

      // Fetch the petition details
      const petitionResult = await pool
        .request()
        .input("id", sql.Int, id)
        .query("SELECT * FROM petition WHERE petition_id = @id");

      const petition = petitionResult.recordset[0];

      if (!petition) {
        return res.status(404).json({ error: "Petition not found" });
      }

      // Fetch attached files from localdoc table
      const filesResult = await pool
        .request()
        .input("petition_id", sql.Int, id)
        .query(
          "SELECT file_id, file_name, description FROM localdoc WHERE petition_id = @petition_id"
        );

      petition.attachedFiles = filesResult.recordset;

      res.json(petition);
    } catch (err) {
      console.error("Error fetching petition details:", err);
      res.status(500).json({ error: "Failed to fetch petition details" });
    }
  });

  // Endpoint to download attached file
  app.get("/student/download-file/:fileId", async (req, res) => {
    const { fileId } = req.params;

    try {
      const pool = await sql.connect(config);

      // Fetch the file information from the database
      const fileResult = await pool
        .request()
        .input("fileId", sql.Int, fileId)
        .query(
          "SELECT file_name, file_path FROM localdoc WHERE file_id = @fileId"
        );

      const file = fileResult.recordset[0];

      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      // Send the file for download
      res.download(path.resolve(file.file_path), file.file_name);
    } catch (err) {
      console.error("Error downloading file:", err);
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  // Fetch specific draft petition details by ID
  app.get("/draft-petitions/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const pool = await sql.connect(config);

      // Fetch the petition
      const petitionResult = await pool
        .request()
        .input("id", sql.Int, id)
        .query("SELECT * FROM petition WHERE petition_id = @id AND status = 1"); // Ensure it's a draft

      const petition = petitionResult.recordset[0];

      if (!petition) {
        return res.status(404).json({ error: "Draft petition not found" });
      }

      // Fetch attached files from localdoc table
      const filesResult = await pool
        .request()
        .input("petition_id", sql.Int, id)
        .query(
          "SELECT file_id, file_name, description FROM localdoc WHERE petition_id = @petition_id"
        );

      petition.attachedFiles = filesResult.recordset;

      res.json(petition);
    } catch (err) {
      console.error("Error fetching draft petition details:", err);
      res.status(500).json({ error: "Failed to fetch draft petition details" });
    }
  });

  // Endpoint to download attached file
  app.get("/download-file/:fileId", async (req, res) => {
    const { fileId } = req.params;
    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .input("fileId", sql.Int, fileId)
        .query(
          "SELECT file_name, file_path FROM localdoc WHERE file_id = @fileId"
        );

      const file = result.recordset[0];
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      res.download(path.resolve(file.file_path), file.file_name);
    } catch (err) {
      console.error("Error downloading file:", err);
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  // Endpoint to remove attached file
  app.delete("/remove-file/:fileId", async (req, res) => {
    const { fileId } = req.params;
    try {
      const pool = await sql.connect(config);

      // Get file info to delete the physical file
      const fileResult = await pool
        .request()
        .input("fileId", sql.Int, fileId)
        .query("SELECT file_path FROM localdoc WHERE file_id = @fileId");

      const file = fileResult.recordset[0];
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      // Delete the record from the database
      await pool
        .request()
        .input("fileId", sql.Int, fileId)
        .query("DELETE FROM localdoc WHERE file_id = @fileId");

      // Delete the physical file
      fs.unlinkSync(path.resolve(file.file_path));

      res.json({ success: true });
    } catch (err) {
      console.error("Error removing file:", err);
      res.status(500).json({ error: "Failed to remove file" });
    }
  });

  app.get("/logout", (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ error: "Failed to log out" });
      }

      // Redirect to the login page after successful logout
      res.redirect("/index.html");
    });
  });

  // Route สำหรับลบแบบร่าง
  app.delete("/delete-petition/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .input("id", sql.Int, id)
        .query("DELETE FROM petition WHERE petition_id = @id AND status = 1"); // Ensure it's a draft before deleting

      if (result.rowsAffected[0] > 0) {
        res.json({ success: true, message: "Draft deleted successfully" });
      } else {
        res.status(404).json({
          success: false,
          message: "Draft not found or cannot delete non-draft petitions",
        });
      }
    } catch (err) {
      console.error("Error deleting draft petition:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to delete draft petition" });
    }
  });

  // Route สำหรับตรวจสอบการเข้าสู่ระบบและสิทธิ์ของผู้ใช้
  app.get("/check-auth", (req, res) => {
    if (!req.session.user) {
      // ผู้ใช้ยังไม่ได้เข้าสู่ระบบ
      res.redirect("/index.html");
    } else if (req.session.user.userType !== "student") {
      // ผู้ใช้ไม่มีสิทธิ์ที่ถูกต้อง
      res.redirect("/index.html");
    } else {
      // ผู้ใช้ได้รับการยืนยันและมีสิทธิ์ที่ถูกต้อง
      res.status(200).json({ message: "Authorized" });
    }
  });

  // เริ่มเซิร์ฟเวอร์
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

// Endpoint สำหรับดึงข้อมูล system_logs
app.get("/api/system-logs", async (req, res) => {
  try {
    const pool = await sql.connect(config);

    const result = await pool.request().query(`
      SELECT 
        log_id, 
        tuusername, 
        role, 
        action, 
        timestamp 
      FROM system_logs 
      ORDER BY timestamp DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching system logs:", err);
    res.status(500).json({ success: false, error: "Failed to fetch logs" });
  }
});

// Endpoint สำหรับดึงรายละเอียด log เฉพาะรายการ
app.get("/api/system-logs/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await sql.connect(config);

    const result = await pool.request().input("id", sql.Int, id).query(`
      SELECT 
        log_id, 
        staff_id, 
        tuusername, 
        role, 
        action, 
        description, 
        timestamp, 
        ip_address, 
        device_info 
      FROM system_logs 
      WHERE log_id = @id
    `);

    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.status(404).json({ success: false, error: "Log not found" });
    }
  } catch (err) {
    console.error("Error fetching log details:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch log details" });
  }
});

// Endpoint สำหรับดึงรายละเอียดของ system_logs
app.get("/api/system-logs/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await sql.connect(config);

    const result = await pool.request().input("id", sql.Int, id).query(`
              SELECT 
                  log_id,
                  staff_id,
                  tuusername,
                  role,
                  action,
                  description,
                  timestamp,
                  ip_address,
                  device_info
              FROM system_logs
              WHERE log_id = @id
          `);

    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.status(404).json({ success: false, error: "Log not found" });
    }
  } catch (err) {
    console.error("Error fetching log details:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch log details" });
  }
});

app.get("/api/faculty-staff", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
          SELECT 
              staff_id,
              university_id,
              academic_title,
              personal_title,
              first_name,
              last_name,
              status,
              branch,
              office,
              role
          FROM faculty_staff
          WHERE role = 1
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching faculty staff:", err);
    res.status(500).json({ error: "Failed to fetch faculty staff" });
  }
});

app.post("/api/faculty-staff", async (req, res) => {
  const {
    university_id,
    academic_title,
    personal_title,
    first_name,
    last_name,
    branch,
    email,
    phone,
    office,
    profile_link,
    status,
    role,
    password, // Added password
  } = req.body;

  // Validate required fields
  if (
    !university_id ||
    !personal_title ||
    !first_name ||
    !last_name ||
    !branch ||
    !email ||
    !phone ||
    !role ||
    !password // Ensure password is provided
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const pool = await sql.connect(config);
    await pool
      .request()
      .input("university_id", sql.NVarChar, university_id)
      .input("academic_title", sql.NVarChar, academic_title)
      .input("personal_title", sql.NVarChar, personal_title)
      .input("first_name", sql.NVarChar, first_name)
      .input("last_name", sql.NVarChar, last_name)
      .input("branch", sql.NVarChar, branch)
      .input("email", sql.NVarChar, email)
      .input("phone", sql.NVarChar, phone)
      .input("office", sql.NVarChar, office)
      .input("profile_link", sql.NVarChar, profile_link)
      .input("status", sql.Int, status)
      .input("role", sql.Int, role)
      .input("password", sql.NVarChar, password) // Add password input
      .query(`
              INSERT INTO faculty_staff 
              (university_id, academic_title, personal_title, first_name, last_name, branch, email, phone, office, profile_link, status, role, password)
              VALUES (@university_id, @academic_title, @personal_title, @first_name, @last_name, @branch, @email, @phone, @office, @profile_link, @status, @role, @password)
          `);
    res.json({ success: true });
  } catch (err) {
    console.error("Error adding new faculty:", err);
    res.status(500).json({ error: "Failed to add new faculty" });
  }
});

app.get("/api/faculty-staff/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request().input("staff_id", sql.Int, id).query(`
              SELECT 
                  staff_id,
                  university_id,
                  academic_title,
                  personal_title,
                  first_name,
                  last_name,
                  branch,
                  email,
                  phone,
                  office,
                  profile_link,
                  status,
                  role
              FROM faculty_staff
              WHERE staff_id = @staff_id AND role = 1
          `);
    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.status(404).json({ error: "Faculty not found" });
    }
  } catch (err) {
    console.error("Error fetching faculty details:", err);
    res.status(500).json({ error: "Failed to fetch faculty details" });
  }
});

app.post("/api/advisor-students", async (req, res) => {
  const { advisor_id, student_id } = req.body;

  try {
    const pool = await sql.connect(config);

    // Retrieve the staff_id and university_id from faculty_staff using advisor_id
    const advisorData = await pool
      .request()
      .input("advisor_id", sql.Int, advisor_id).query(`
        SELECT university_id
        FROM faculty_staff
        WHERE staff_id = @advisor_id
      `);

    if (advisorData.recordset.length === 0) {
      return res
        .status(404)
        .json({ error: "Advisor not found with the given staff_id" });
    }

    const university_id = advisorData.recordset[0].university_id;

    // Insert university_id as advisor_id into advisor_info
    await pool
      .request()
      .input("advisor_id", sql.NVarChar, university_id)
      .input("student_id", sql.NVarChar, student_id).query(`
        INSERT INTO advisor_info (advisor_id, student_id)
        VALUES (@advisor_id, @student_id)
      `);

    res.json({ success: true });
  } catch (err) {
    console.error("Error adding advisor student:", err);
    res.status(500).json({ error: "Failed to add advisor student" });
  }
});

app.get("/api/advisor-students/:staff_id", async (req, res) => {
  const { staff_id } = req.params;
  console.log("Staff ID received:", staff_id);

  try {
    const pool = await sql.connect(config);

    // Step 1: Find the university_id from faculty_staff using staff_id
    const universityResult = await pool
      .request()
      .input("staff_id", sql.Int, staff_id).query(`
        SELECT university_id
        FROM faculty_staff
        WHERE staff_id = @staff_id
      `);

    // Ensure a valid university_id is returned
    if (universityResult.recordset.length === 0) {
      console.warn("No university_id found for staff_id:", staff_id);
      return res.status(404).json({ error: "Faculty staff not found" });
    }

    const university_id = universityResult.recordset[0].university_id;
    console.log("University ID found:", university_id);

    // Step 2: Use the university_id to find advisor-student relationships
    const advisorResult = await pool
      .request()
      .input("advisor_id", sql.NVarChar, university_id).query(`
        SELECT id, student_id
        FROM advisor_info
        WHERE advisor_id = @advisor_id
      `);

    console.log(
      "Advisor-Student relationships found:",
      advisorResult.recordset
    );

    res.json(advisorResult.recordset);
  } catch (err) {
    console.error("Error fetching advisor students:", err.message);
    res.status(500).json({ error: "Failed to fetch advisor students" });
  }
});

app.delete("/api/advisor-students/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await sql.connect(config);
    await pool.request().input("id", sql.Int, id).query(`
              DELETE FROM advisor_info
              WHERE id = @id
          `);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting advisor student:", err);
    res.status(500).json({ error: "Failed to delete advisor student" });
  }
});

// ดึงรายการรายวิชาทั้งหมด
app.get("/api/courses", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
          SELECT 
              course_id,
              course_code,
              course_name,
              sections,
              curriculum_year
          FROM courses
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching courses:", err);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// เพิ่มรายวิชาใหม่พร้อม sections
app.post("/api/courses", async (req, res) => {
  const { course_code, course_name, curriculum_year, faculty_id, sections } =
    req.body;

  // ตรวจสอบข้อมูลที่จำเป็น
  if (
    !course_code ||
    !course_name ||
    !curriculum_year ||
    !faculty_id ||
    !sections ||
    sections.length === 0
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const pool = await sql.connect(config);

    // สร้าง sectionsData ที่ประกอบด้วย staff_id และ section
    const sectionsData = sections.map((section) => ({
      staff_id: parseInt(faculty_id),
      section,
    }));

    await pool
      .request()
      .input("course_code", sql.NVarChar, course_code)
      .input("course_name", sql.NVarChar, course_name)
      .input("curriculum_year", sql.Int, curriculum_year)
      .input("sections", sql.NVarChar(sql.MAX), JSON.stringify(sectionsData))
      .query(`
              INSERT INTO courses (course_code, course_name, curriculum_year, sections)
              VALUES (@course_code, @course_name, @curriculum_year, @sections)
          `);
    res.json({ success: true });
  } catch (err) {
    console.error("Error adding new course:", err);
    res.status(500).json({ error: "Failed to add new course" });
  }
});

// เพิ่ม sections ให้กับรายวิชาที่มีอยู่แล้ว
app.post("/api/courses/:course_id/sections", async (req, res) => {
  let course_id = req.params.course_id;
  let { faculty_id, sections } = req.body;

  // แปลงค่าเป็นตัวเลขและตรวจสอบความถูกต้อง
  course_id = parseInt(course_id);
  faculty_id = parseInt(faculty_id);

  if (
    isNaN(course_id) ||
    isNaN(faculty_id) ||
    !sections ||
    sections.length === 0
  ) {
    return res
      .status(400)
      .json({ error: "Invalid course_id, faculty_id, or sections" });
  }

  try {
    const pool = await sql.connect(config);

    // ดึง Sections ที่มีอยู่แล้ว
    const result = await pool.request().input("course_id", sql.Int, course_id)
      .query(`
              SELECT sections
              FROM courses
              WHERE course_id = @course_id
          `);

    let existingSections = [];
    if (result.recordset.length > 0 && result.recordset[0].sections) {
      existingSections = JSON.parse(result.recordset[0].sections);
    }

    // สร้างรายการ Sections ใหม่
    const newSections = sections.map((section) => ({
      staff_id: faculty_id,
      section,
    }));
    const updatedSections = existingSections.concat(newSections);

    // อัปเดต Sections ในฐานข้อมูล
    await pool
      .request()
      .input("course_id", sql.Int, course_id)
      .input("sections", sql.NVarChar(sql.MAX), JSON.stringify(updatedSections))
      .query(`
              UPDATE courses
              SET sections = @sections
              WHERE course_id = @course_id
          `);

    res.json({ success: true });
  } catch (err) {
    console.error("Error adding sections to course:", err);
    res.status(500).json({ error: "Failed to add sections to course" });
  }
});
//ใช้ดึงรายวิชาที่มี sections ที่เกี่ยวข้องกับอาจารย์คนนั้น
app.get("/api/courses/:course_id/sections", async (req, res) => {
  const { course_id } = req.params;

  try {
    const pool = await sql.connect(config);

    // Fetch sections for the course
    const result = await pool.request().input("course_id", sql.Int, course_id)
      .query(`
        SELECT sections 
        FROM courses 
        WHERE course_id = @course_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    const sections = JSON.parse(result.recordset[0].sections);

    // Fetch faculty staff details for each section's staff_id
    const staffIds = sections.map((section) => section.staff_id);
    const facultyResult = await pool.request().query(`
        SELECT staff_id, ISNULL(academic_title, personal_title) AS title, first_name, last_name
        FROM faculty_staff
        WHERE staff_id IN (${staffIds.join(",")})
      `);

    const facultyMap = {};
    facultyResult.recordset.forEach((staff) => {
      facultyMap[staff.staff_id] = `${staff.title || ""} ${staff.first_name} ${
        staff.last_name
      }`.trim();
    });

    // Enrich sections with instructor_name
    const enrichedSections = sections.map((section) => ({
      ...section,
      instructor_name: facultyMap[section.staff_id] || "Unknown",
    }));

    res.json(enrichedSections);
  } catch (error) {
    console.error("Error fetching sections:", error);
    res.status(500).json({ error: "Failed to fetch sections" });
  }
});

// ดึงรายวิชาที่สอนโดยอาจารย์
app.get("/api/teaching-courses/:faculty_id", async (req, res) => {
  const { faculty_id } = req.params;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request().input("faculty_id", sql.Int, faculty_id)
      .query(`
              SELECT 
                  course_id,
                  course_code,
                  course_name,
                  sections,
                  curriculum_year
              FROM courses
          `);

    // กรองรายวิชาที่สอนโดยอาจารย์คนนั้น
    const teachingCourses = result.recordset
      .filter((course) => {
        if (course.sections) {
          const sections = JSON.parse(course.sections);
          return sections.some((sec) => sec.staff_id === parseInt(faculty_id));
        }
        return false;
      })
      .map((course) => {
        const sections = JSON.parse(course.sections).filter(
          (sec) => sec.staff_id === parseInt(faculty_id)
        );
        return {
          course_id: course.course_id,
          course_code: course.course_code,
          course_name: course.course_name,
          curriculum_year: course.curriculum_year,
          sections: sections,
        };
      });

    res.json(teachingCourses);
  } catch (err) {
    console.error("Error fetching teaching courses:", err);
    res.status(500).json({ error: "Failed to fetch teaching courses" });
  }
});

// ลบรายวิชาที่สอนโดยอาจารย์ (ลบ sections ที่เกี่ยวข้อง)
app.delete(
  "/api/teaching-courses/:course_id/faculty/:faculty_id",
  async (req, res) => {
    const { course_id, faculty_id } = req.params;

    try {
      const pool = await sql.connect(config);

      // ดึง sections เดิมจากฐานข้อมูล
      const result = await pool.request().input("course_id", sql.Int, course_id)
        .query(`
              SELECT sections
              FROM courses
              WHERE course_id = @course_id
          `);

      let existingSections = [];
      if (result.recordset.length > 0 && result.recordset[0].sections) {
        existingSections = JSON.parse(result.recordset[0].sections);
      }

      // ลบ sections ที่เกี่ยวข้องกับ faculty_id
      const updatedSections = existingSections.filter(
        (sec) => sec.staff_id !== parseInt(faculty_id)
      );

      // อัปเดต sections ในฐานข้อมูล
      await pool
        .request()
        .input("course_id", sql.Int, course_id)
        .input("sections", sql.NVarChar, JSON.stringify(updatedSections))
        .query(`
              UPDATE courses
              SET sections = @sections
              WHERE course_id = @course_id
          `);

      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting teaching course:", err);
      res.status(500).json({ error: "Failed to delete teaching course" });
    }
  }
);

// ดึงรายการบุคลากรที่มี role = 2 หรือ 3
app.get("/api/administrative-staff", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
              SELECT
                  staff_id,
                  university_id,
                  academic_title,
                  personal_title,
                  first_name,
                  last_name,
                  status,
                  office,
                  role
              FROM faculty_staff
              WHERE role IN (2, 3)
          `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching administrative staff:", err);
    res.status(500).json({ error: "Failed to fetch administrative staff" });
  }
});

// ดึงข้อมูลบุคลากรโดยใช้ staff_id
app.get("/api/administrative-staff/:id", async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: "Invalid staff ID" });
  }

  try {
    const pool = await sql.connect(config);
    const result = await pool.request().input("staff_id", sql.Int, id).query(`
              SELECT
                  staff_id,
                  university_id,
                  academic_title,
                  personal_title,
                  first_name,
                  last_name,
                  status,
                  office,
                  role,
                  branch,
                  email,
                  phone,
                  profile_link
              FROM faculty_staff
              WHERE staff_id = @staff_id AND role IN (2, 3)
          `);

    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.status(404).json({ error: "Staff member not found" });
    }
  } catch (err) {
    console.error("Error fetching staff details:", err);
    res.status(500).json({ error: "Failed to fetch staff details" });
  }
});

app.post("/api/administrative-staff", async (req, res) => {
  const {
    university_id,
    academic_title,
    personal_title,
    first_name,
    last_name,
    office,
    status,
    role,
    branch,
    email,
    phone,
    profile_link,
    password,
  } = req.body;

  // Set default password if not provided
  const finalPassword = password || "test";

  // Validate required fields
  if (
    !university_id ||
    !personal_title ||
    !first_name ||
    !last_name ||
    !role ||
    ![2, 3].includes(role)
  ) {
    return res
      .status(400)
      .json({ error: "Missing or invalid required fields" });
  }

  try {
    const pool = await sql.connect(config);
    await pool
      .request()
      .input("university_id", sql.NVarChar, university_id)
      .input("academic_title", sql.NVarChar, academic_title)
      .input("personal_title", sql.NVarChar, personal_title)
      .input("first_name", sql.NVarChar, first_name)
      .input("last_name", sql.NVarChar, last_name)
      .input("office", sql.NVarChar, office)
      .input("status", sql.Int, status)
      .input("role", sql.Int, role)
      .input("branch", sql.NVarChar, branch)
      .input("email", sql.NVarChar, email)
      .input("phone", sql.NVarChar, phone)
      .input("profile_link", sql.NVarChar, profile_link)
      .input("password", sql.NVarChar, finalPassword) // Use finalPassword
      .query(`
        INSERT INTO faculty_staff (
          university_id, academic_title, personal_title, first_name, last_name, office, status, role, branch, email, phone, profile_link, password
        )
        VALUES (
          @university_id, @academic_title, @personal_title, @first_name, @last_name, @office, @status, @role, @branch, @email, @phone, @profile_link, @password
        )
      `);

    res.json({ success: true });
  } catch (err) {
    console.error("Error adding new staff member:", err);

    // Check if the error is due to a duplicate username
    if (err.code === "EREQUEST") {
      return res.status(400).json({ error: "Username already exists" });
    }

    res.status(500).json({ error: "Failed to add new staff member" });
  }
});

// แก้ไขข้อมูลบุคลากร
app.put("/api/administrative-staff/:id", async (req, res) => {
  const { id } = req.params;
  const {
    university_id,
    academic_title,
    personal_title,
    first_name,
    last_name,
    office,
    status,
    role,
    branch,
    email,
    phone,
    profile_link,
  } = req.body;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: "Invalid staff ID" });
  }

  if (
    !university_id ||
    !personal_title ||
    !first_name ||
    !last_name ||
    !role ||
    ![2, 3].includes(role)
  ) {
    return res
      .status(400)
      .json({ error: "Missing or invalid required fields" });
  }

  try {
    const pool = await sql.connect(config);
    await pool
      .request()
      .input("staff_id", sql.Int, id)
      .input("university_id", sql.NVarChar, university_id)
      .input("academic_title", sql.NVarChar, academic_title)
      .input("personal_title", sql.NVarChar, personal_title)
      .input("first_name", sql.NVarChar, first_name)
      .input("last_name", sql.NVarChar, last_name)
      .input("office", sql.NVarChar, office)
      .input("status", sql.Int, status)
      .input("role", sql.Int, role)
      .input("branch", sql.NVarChar, branch)
      .input("email", sql.NVarChar, email)
      .input("phone", sql.NVarChar, phone)
      .input("profile_link", sql.NVarChar, profile_link).query(`
              UPDATE faculty_staff
              SET
                  university_id = @university_id,
                  academic_title = @academic_title,
                  personal_title = @personal_title,
                  first_name = @first_name,
                  last_name = @last_name,
                  office = @office,
                  status = @status,
                  role = @role,
                  branch = @branch,
                  email = @email,
                  phone = @phone,
                  profile_link = @profile_link
              WHERE staff_id = @staff_id AND role IN (2, 3)
          `);
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating staff member:", err);
    res.status(500).json({ error: "Failed to update staff member" });
  }
});

app.get("/api/petitions", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
          SELECT petition_id, student_id, student_name, petition_type, subject_code, status
          FROM petition
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching petitions:", error);
    res.status(500).json({ error: "Failed to fetch petitions" });
  }
});

app.get("/api/petitions/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`SELECT * FROM petition WHERE petition_id = @id`);
    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.status(404).json({ error: "Petition not found" });
    }
  } catch (error) {
    console.error("Error fetching petition details:", error);
    res.status(500).json({ error: "Failed to fetch petition details" });
  }
});

app.post("/api/petitions/:id/cancel", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await sql.connect(config);
    await pool
      .request()
      .input("id", sql.Int, id)
      .query(`UPDATE petition SET status = 22 WHERE petition_id = @id`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error cancelling petition:", error);
    res.status(500).json({ error: "Failed to cancel petition" });
  }
});

app.get("/api/courses", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
              SELECT 
                  course_id,
                  course_code,
                  course_name
              FROM courses
          `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching courses:", err);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

app.get("/:course_id/sections", async (req, res) => {
  const { course_id } = req.params;
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().input("course_id", sql.Int, course_id)
      .query(`
              SELECT sections
              FROM courses
              WHERE course_id = @course_id
          `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    const course = result.recordset[0];
    let sections = [];
    try {
      sections = JSON.parse(course.sections);
    } catch (parseError) {
      console.error("Error parsing sections JSON:", parseError);
    }

    if (!Array.isArray(sections)) {
      console.warn("Sections is not an array. Defaulting to an empty array.");
      sections = [];
    }

    console.log("Parsed sections:", sections);

    // Get unique staff_ids
    const staffIds = [...new Set(sections.map((s) => s.staff_id))];

    // Fetch instructor names using parameterized queries
    let instructors = [];
    if (staffIds.length > 0) {
      const request = pool.request();
      staffIds.forEach((id, index) => {
        request.input(`staffId${index}`, sql.Int, id);
      });

      const staffIdPlaceholders = staffIds
        .map((id, index) => `@staffId${index}`)
        .join(",");

      const query = `
              SELECT staff_id, first_name, last_name
              FROM faculty_staff
              WHERE staff_id IN (${staffIdPlaceholders})
          `;
      const instructorsResult = await request.query(query);
      instructors = instructorsResult.recordset;
    }

    // Map staff_id to instructor's full name
    const staffIdToName = {};
    instructors.forEach((inst) => {
      staffIdToName[inst.staff_id] = `${inst.first_name} ${inst.last_name}`;
    });

    // Combine sections with instructor names
    const sectionsWithInstructor = sections.map((sec) => ({
      staff_id: sec.staff_id,
      section: sec.section,
      instructor_name: staffIdToName[sec.staff_id] || "",
    }));

    res.json(sectionsWithInstructor);
  } catch (err) {
    console.error("Error fetching sections:", err);
    res.status(500).json({ error: "Failed to fetch sections" });
  }
});

app.get("/api/petitions/:id", async (req, res) => {
  const { id } = req.params;
  console.log("Fetching petition ID:", id); // Debugging

  try {
    const pool = await sql.connect(config);
    const result = await pool.request().input("id", sql.Int, id).query(`
        SELECT * 
        FROM petition 
        WHERE petition_id = @id;
      `);

    if (result.recordset.length === 0) {
      console.warn("Petition not found:", id);
      return res.status(404).json({ error: "Petition not found" });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error("Error fetching petition details:", error);
    res.status(500).json({ error: "Failed to fetch petition details" });
  }
});

app.post("/api/petitions/:id/cancel", async (req, res) => {
  const { id } = req.params;
  console.log("Cancelling petition ID:", id); // Debugging

  try {
    const pool = await sql.connect(config);
    const result = await pool.request().input("id", sql.Int, id).query(`
        UPDATE petition 
        SET status = 20, review_time_a = GETDATE() 
        WHERE petition_id = @id;
      `);

    if (result.rowsAffected[0] === 0) {
      console.warn("Petition not found or not updated:", id);
      return res
        .status(404)
        .json({ error: "Petition not found or cannot be canceled" });
    }

    res.json({ success: true, message: "Petition canceled successfully" });
  } catch (error) {
    console.error("Error cancelling petition:", error);
    res.status(500).json({ error: "Failed to cancel petition" });
  }
});

app.post("/api/logs", async (req, res) => {
  const {
    staff_id,
    tuusername,
    role,
    action,
    description,
    ip_address,
    device_info,
  } = req.body;

  // Validate required fields
  if (!tuusername || !role || !action) {
    return res
      .status(400)
      .json({ error: "Missing required fields: tuusername, role, action." });
  }

  // Ensure role is within the valid range
  if (role < 1 || role > 5) {
    return res.status(400).json({ error: "Role must be between 1 and 5." });
  }

  try {
    const pool = await sql.connect(config);

    // Insert log into the system_logs table
    await pool
      .request()
      .input("staff_id", sql.Int, staff_id || null) // staff_id is optional
      .input("tuusername", sql.NVarChar, tuusername)
      .input("role", sql.Int, role) // Role is now INT
      .input("action", sql.NVarChar, action)
      .input("description", sql.NVarChar, description || null) // Description is optional
      .input("ip_address", sql.NVarChar, ip_address || null) // IP Address is optional
      .input("device_info", sql.Text, device_info || null) // Device Info is optional
      .query(`
        INSERT INTO system_logs (
          staff_id, tuusername, role, action, description, ip_address, device_info
        )
        VALUES (
          @staff_id, @tuusername, @role, @action, @description, @ip_address, @device_info
        )
      `);

    res.status(200).json({ success: true, message: "Log saved successfully." });
  } catch (error) {
    console.error("Error saving log:", error);
    res.status(500).json({ error: "Failed to save log." });
  }
});

// GET: คืนค่าข้อมูลทั้งหมดด้วย staff_id
app.get("/api/staff/:id", async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: "Invalid staff ID" });
  }

  try {
    const pool = await sql.connect(config);
    const result = await pool.request().input("staff_id", sql.Int, id).query(`
              SELECT *
              FROM faculty_staff
              WHERE staff_id = @staff_id
          `);

    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.status(404).json({ error: "Staff not found" });
    }
  } catch (err) {
    console.error("Error fetching staff details:", err);
    res.status(500).json({ error: "Failed to fetch staff details" });
  }
});

// GET: คืนค่า university_id ด้วย staff_id
app.get("/api/staff/:id/university_id", async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: "Invalid staff ID" });
  }

  try {
    const pool = await sql.connect(config);
    const result = await pool.request().input("staff_id", sql.Int, id).query(`
              SELECT university_id
              FROM faculty_staff
              WHERE staff_id = @staff_id
          `);

    if (result.recordset.length > 0) {
      res.json({ university_id: result.recordset[0].university_id });
    } else {
      res.status(404).json({ error: "Staff not found" });
    }
  } catch (err) {
    console.error("Error fetching university_id:", err);
    res.status(500).json({ error: "Failed to fetch university_id" });
  }
});

// Endpoint สำหรับดึงข้อมูลทั้งหมดที่อยู่ใน session
app.get("/api/session", (req, res) => {
  if (req.session && req.session.user) {
    // ถ้ามี session อยู่ ให้ส่งข้อมูลใน session กลับไป
    res.json({
      success: true,
      data: {
        username: req.session.user.username || "",
        email: req.session.user.email || "",
        displayname_en: req.session.user.displayname_en || "",
        displayname_th: req.session.user.displayname_th || "",
        faculty: req.session.user.faculty || "",
        department: req.session.user.department || "",
        userType: req.session.user.userType || "",
      },
    });
  } else {
    // ถ้าไม่มี session ให้ส่งค่าเริ่มต้นกลับไป
    res.json({
      success: false,
      message: "No session found",
      data: {
        username: "",
        email: "",
        displayname_en: "",
        displayname_th: "",
        faculty: "",
        department: "",
        userType: "",
      },
    });
  }
});

app.get("/api/staff-id", async (req, res) => {
  const { university_id } = req.query;

  if (!university_id) {
    return res.status(400).json({ error: "Missing university_id parameter" });
  }

  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("university_id", sql.NVarChar, university_id).query(`
              SELECT staff_id
              FROM faculty_staff
              WHERE university_id = @university_id
          `);

    if (result.recordset.length > 0) {
      res.json({ staff_id: result.recordset[0].staff_id });
    } else {
      res
        .status(404)
        .json({ error: "No staff found with the provided university_id" });
    }
  } catch (error) {
    console.error("Error fetching staff ID:", error);
    res.status(500).json({ error: "Failed to fetch staff ID" });
  }
});

StartServer();
