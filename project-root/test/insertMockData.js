const sql = require("mssql");
require("dotenv").config(); // Load environment variables from .env file

// SQL Server connection configuration
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: "0.0.0.0",
  port: 1433,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

const insertMockData = async () => {
  const mockPetitions = [
    // Petition that should be returned in pendingResult for the teacher
    {
      student_id: "6609611111",
      student_name: "Somchai Teerawat",
      major: "Computer Science",
      year: 2,
      house_number: "123",
      moo: "4",
      sub_district: "Suburb",
      district: "City",
      province: "State",
      postcode: "12345",
      student_phone: "0812345678",
      guardian_phone: "0819876543",
      petition_type: "1",
      semester: "1/2024",
      subject_code: "CS101",
      subject_name: "Advanced Computer Science",
      section: "001",
      reason: "Change schedule",
      status: 6, // Pending
      submit_time: "2024-11-23T12:00:00.000Z",
    },
    // Petition that should be returned in reviewedResult for the teacher
    {
      student_id: "6609612222",
      student_name: "Jirayut Karnchai",
      major: "Data Science",
      year: 3,
      house_number: "456",
      moo: "5",
      sub_district: "Village",
      district: "District",
      province: "Province",
      postcode: "23456",
      student_phone: "0823456789",
      guardian_phone: "0829876543",
      petition_type: "1",
      semester: "1/2024",
      subject_code: "MATH101",
      subject_name: "Data Science Fundamentals",
      section: "002",
      reason: "Wrong grade entered",
      status: 8, // Reviewed
      submit_time: "2024-11-22T14:30:00.000Z",
    },
    // Petition that should NOT be returned (different staff_id)
    {
      student_id: "6609613333",
      student_name: "Araya Sangsawan",
      major: "Software Engineering",
      year: 4,
      house_number: "789",
      moo: "6",
      sub_district: "Town",
      district: "County",
      province: "Region",
      postcode: "34567",
      student_phone: "0834567890",
      guardian_phone: "0839876543",
      petition_type: "1",
      semester: "1/2024",
      subject_code: "PHYS101",
      subject_name: "Software Engineering II",
      section: "003",
      reason: "Request review",
      status: 9, // Reviewed
      submit_time: "2024-11-21T09:15:00.000Z",
    },
    {
      student_id: "6609611112",
      student_name: "Somchai Teerawat",
      major: "Computer Science",
      year: 2,
      house_number: "123",
      moo: "4",
      sub_district: "Suburb",
      district: "City",
      province: "State",
      postcode: "12345",
      student_phone: "0812345678",
      guardian_phone: "0819876543",
      petition_type: "1",
      semester: "1/2024",
      subject_code: "CS101",
      subject_name: "Advanced Computer Science",
      section: "001",
      reason: "Change schedule",
      status: 3, // Pending
      submit_time: "2024-11-23T12:00:00.000Z",
    },
    {
      student_id: "6609611113",
      student_name: "Sommai Teerawat",
      major: "Computer Science",
      year: 2,
      house_number: "123",
      moo: "4",
      sub_district: "Suburb",
      district: "City",
      province: "State",
      postcode: "12345",
      student_phone: "0812345678",
      guardian_phone: "0819876543",
      petition_type: "1",
      semester: "1/2024",
      subject_code: "CS101",
      subject_name: "Advanced Computer Science",
      section: "001",
      reason: "Change schedule",
      status: 3, // Pending
      submit_time: "2024-11-23T12:00:00.000Z",
    },
    {
      student_id: "6609611113",
      student_name: "Sompong Teerawat",
      major: "Computer Science",
      year: 2,
      house_number: "123",
      moo: "4",
      sub_district: "Suburb",
      district: "City",
      province: "State",
      postcode: "12345",
      student_phone: "0812345678",
      guardian_phone: "0819876543",
      petition_type: "1",
      semester: "1/2024",
      subject_code: "CS101",
      subject_name: "Advanced Computer Science",
      section: "001",
      reason: "Change schedule",
      status: 11, // Pending
      submit_time: "2024-11-23T12:00:00.000Z",
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
        (3, 'U003', '', 'Mr.', 'Mike', 'Johnson', 1, 'Room 303', 2),
        (4, 'U004', 'Prof.','Dr.','Somsak','Charoen', 1, 'Dean Office',2);
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
