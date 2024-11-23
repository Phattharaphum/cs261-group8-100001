const sql = require("mssql");
require("dotenv").config(); // Load environment variables from .env file

// SQL Server connection configuration
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

const insertMockData = async () => {
  const mockPetitions = [
    {
      student_id: "6609611790",
      student_name: "นาย จิรายุ เจริญยศ",
      major: "ภาควิชาวิทยาการคอมพิวเตอร์",
      year: 2,
      house_number: "111",
      moo: "1",
      sub_district: "1",
      district: "1",
      province: "1",
      postcode: "11111",
      student_phone: "0811111111",
      guardian_phone: "0811111111",
      petition_type: "1",
      semester: "1/2024",
      subject_code: "CS888",
      subject_name: "Introduction to Advanced Computing",
      section: "1",
      reason: "ทดสอบคำร้อง",
      status: 2,
      submit_time: "2024-11-22T23:02:28.780Z",
    },
    {
      student_id: "6609612345",
      student_name: "นาย สมชาย ทดสอบ",
      major: "ภาควิชาวิทยาศาสตร์ข้อมูล",
      year: 3,
      house_number: "222",
      moo: "2",
      sub_district: "2",
      district: "2",
      province: "2",
      postcode: "22222",
      student_phone: "0822222222",
      guardian_phone: "0822222222",
      petition_type: "2",
      semester: "1/2024",
      subject_code: "DS101",
      subject_name: "Data Science Fundamentals",
      section: "2",
      reason: "เพิ่มรายวิชา",
      status: 3,
      submit_time: "2024-11-23T10:00:00.000Z",
    },
    {
      student_id: "6609613456",
      student_name: "นาย เอกชัย วิทยา",
      major: "ภาควิชาวิศวกรรมซอฟต์แวร์",
      year: 4,
      house_number: "333",
      moo: "3",
      sub_district: "3",
      district: "3",
      province: "3",
      postcode: "33333",
      student_phone: "0833333333",
      guardian_phone: "0833333333",
      petition_type: "3",
      semester: "1/2024",
      subject_code: "SE202",
      subject_name: "Software Engineering II",
      section: "3",
      reason: "แก้ไขคะแนนสอบ",
      status: 4,
      submit_time: "2024-11-23T15:00:00.000Z",
    },
  ];

  let pool;
  try {
    pool = await sql.connect(config);
    console.log("Connected to the database!");

    // Clear existing data and reset identity columns
    console.log("Clearing old data...");
    await pool.query(`
      DELETE FROM petition;
      DELETE FROM courses;
      DELETE FROM faculty_staff;
      DBCC CHECKIDENT ('petition', RESEED, 0);
      DBCC CHECKIDENT ('courses', RESEED, 0);
      DBCC CHECKIDENT ('faculty_staff', RESEED, 0);
    `);
    console.log("Old data cleared and identity columns reset.");

    // Insert data into faculty_staff
    console.log("Inserting data into faculty_staff...");
    await pool.query(`
      SET IDENTITY_INSERT faculty_staff ON;
      INSERT INTO faculty_staff (
        staff_id,
        university_id,
        academic_title,
        personal_title,
        first_name,
        last_name,
        status,
        office,
        role
      ) VALUES 
        (1, 'U001', 'Dr.', 'Mr.', 'John', 'Doe', 1, 'Room 101', 1),
        (2, 'U002', 'Prof.', 'Ms.', 'Jane', 'Smith', 1, 'Room 202', 1),
        (3, 'U003', '', 'Mr.', 'Mike', 'Johnson', 1, 'Room 303', 2);
      SET IDENTITY_INSERT faculty_staff OFF;
    `);
    console.log("Inserted mock data into faculty_staff.");

    // Insert data into courses
    console.log("Inserting data into courses...");
    await pool.query(`
      SET IDENTITY_INSERT courses ON;
      INSERT INTO courses (
        course_id,
        course_code,
        course_name,
        sections,
        curriculum_year
      ) VALUES 
        (1, 'CS101', 'Introduction to Computer Science', '{"staff_id": 1, "section": "001"}', 2024),
        (2, 'MATH101', 'Calculus I', '{"staff_id": 2, "section": "001"}', 2024),
        (3, 'PHYS101', 'Mechanics', '{"staff_id": 3, "section": "001"}', 2024);
      SET IDENTITY_INSERT courses OFF;
    `);
    console.log("Inserted mock data into courses.");

    // Insert data into petition
    console.log("Inserting data into petition...");
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    for (const petition of mockPetitions) {
      const petitionRequest = new sql.Request(transaction);
      petitionRequest.input("student_id", sql.NVarChar, petition.student_id);
      petitionRequest.input(
        "student_name",
        sql.NVarChar,
        petition.student_name
      );
      petitionRequest.input("major", sql.NVarChar, petition.major);
      petitionRequest.input("year", sql.Int, petition.year);
      petitionRequest.input(
        "house_number",
        sql.NVarChar,
        petition.house_number
      );
      petitionRequest.input("moo", sql.NVarChar, petition.moo);
      petitionRequest.input(
        "sub_district",
        sql.NVarChar,
        petition.sub_district
      );
      petitionRequest.input("district", sql.NVarChar, petition.district);
      petitionRequest.input("province", sql.NVarChar, petition.province);
      petitionRequest.input("postcode", sql.NVarChar, petition.postcode);
      petitionRequest.input(
        "student_phone",
        sql.NVarChar,
        petition.student_phone
      );
      petitionRequest.input(
        "guardian_phone",
        sql.NVarChar,
        petition.guardian_phone
      );
      petitionRequest.input(
        "petition_type",
        sql.NVarChar,
        petition.petition_type
      );
      petitionRequest.input("semester", sql.NVarChar, petition.semester);
      petitionRequest.input(
        "subject_code",
        sql.NVarChar,
        petition.subject_code
      );
      petitionRequest.input(
        "subject_name",
        sql.NVarChar,
        petition.subject_name
      );
      petitionRequest.input("section", sql.NVarChar, petition.section);
      petitionRequest.input("reason", sql.NVarChar, petition.reason);
      petitionRequest.input("status", sql.TinyInt, petition.status);
      petitionRequest.input("submit_time", sql.DateTime, petition.submit_time);

      await petitionRequest.query(`
        INSERT INTO petition (
          student_id, student_name, major, year, house_number, moo, sub_district, district,
          province, postcode, student_phone, guardian_phone, petition_type, semester,
          subject_code, subject_name, section, reason, status, submit_time
        )
        VALUES (
          @student_id, @student_name, @major, @year, @house_number, @moo, @sub_district, @district,
          @province, @postcode, @student_phone, @guardian_phone, @petition_type, @semester,
          @subject_code, @subject_name, @section, @reason, @status, @submit_time
        );
      `);
    }

    await transaction.commit();
    console.log("Inserted mock data into petition.");

    console.log("All mock data inserted successfully!");
  } catch (err) {
    console.error("Error inserting mock data:", err);
  } finally {
    if (pool) {
      pool.close();
      console.log("Database connection closed.");
    }
  }
};

// Execute the mock data insertion
insertMockData();
