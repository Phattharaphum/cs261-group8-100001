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
} = require("./middleware/authMiddleware");
const loggerMiddleware = require("./middleware/loggerMiddleware");
const errorHandler = require("./middleware/errorHandler");
const multer = require("multer");
const router = express.Router();
const fs = require("fs");

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
      // ตรวจสอบ username และ password สำหรับ userType: 'teacher'
      if (username === "0001" && password === "test") {
        req.session.user = {
          username: username,
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
                SET status = @status, review_time = GETDATE()
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
    const { status } = req.body;

    try {
      const pool = await sql.connect(config);

      await pool
        .request()
        .input("id", sql.Int, id)
        .input("status", sql.TinyInt, status).query(`
                UPDATE petition 
                SET status = @status, review_time = GETDATE()
                WHERE petition_id = @id
            `);

      res.json({ success: true });
    } catch (err) {
      console.error("Error updating petition status and review time:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to update petition status" });
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

      try {
        const pool = await sql.connect(config);

        // Start a transaction to ensure data integrity
        const transaction = new sql.Transaction(pool);

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
        petitionRequest.input("reason", sql.NVarChar, reason || ""); // เพิ่ม reason

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
            "description",
            sql.NVarChar,
            req.body.description || ""
          );
          fileRequest1.input("file_path", sql.NVarChar, file1.path);

          await fileRequest1.query(`
                INSERT INTO localdoc (petition_id, file_type, file_name, description, file_path)
                VALUES (@petition_id, @file_type, @file_name, @description, @file_path)
            `);
        }

        if (files && files.attachFile02) {
          const file2 = files.attachFile02[0];
          const fileRequest2 = new sql.Request(transaction);
          fileRequest2.input("petition_id", sql.Int, petitionId);
          fileRequest2.input("file_type", sql.NVarChar, file2.mimetype);
          fileRequest2.input("file_name", sql.NVarChar, file2.originalname);
          fileRequest2.input(
            "description",
            sql.NVarChar,
            req.body.description02 || ""
          );
          fileRequest2.input("file_path", sql.NVarChar, file2.path);

          await fileRequest2.query(`
                INSERT INTO localdoc (petition_id, file_type, file_name, description, file_path)
                VALUES (@petition_id, @file_type, @file_name, @description, @file_path)
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
            .input("description", sql.NVarChar, req.body.description || "")
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
            .input("description", sql.NVarChar, req.body.description02 || "")
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
            WHERE a.advisor_id = @advisorId AND p.status = 2
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
          .query(`SELECT * FROM petition WHERE status = 2 AND student_id IN 
                    (SELECT student_id FROM advisor_info WHERE advisor_id = @advisorId)`);

        const reviewedResult = await pool
          .request()
          .input("advisorId", sql.NVarChar, advisorId)
          .query(`SELECT * FROM petition WHERE status IN (3, 4, 5) AND student_id IN 
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

  app.post("/advisor/update-petition/:id", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      const pool = await sql.connect(config);

      await pool
        .request()
        .input("id", sql.Int, id)
        .input("status", sql.TinyInt, status)
        .query("UPDATE petition SET status = @status WHERE petition_id = @id");

      res.json({ success: true });
    } catch (err) {
      console.error(err);
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
            "SELECT * FROM petition WHERE student_id = @studentId AND status IN (2, 3, 4, 5, 6)"
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

StartServer();
