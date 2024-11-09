import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';

@Injectable()
export class DatabaseService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const dbConfig = this.configService.get('database');
    try {
      const pool = await sql.connect(dbConfig);
      console.log('Connected to the database');

      // Run initial setup if tables do not exist
      await this.initializeTables(pool);
    } catch (error) {
      console.error('Database connection failed:', error);
    }
  }

  private async initializeTables(pool: sql.ConnectionPool) {
    const tableCheckQuery = `
      SELECT * FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME IN ('petition', 'advisor_info')
    `;

    const result = await pool.request().query(tableCheckQuery);

    // Check if both tables already exist
    const tables = result.recordset.map((table) => table.TABLE_NAME);
    if (tables.includes('petition') && tables.includes('advisor_info')) {
      console.log('Tables already initialized. Skipping creation.');
      return;
    }

    // Tables do not exist, so create them
    console.log('Initializing tables...');

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

    try {
      await pool.request().query(createPetitionTable);
      console.log('Petition table created successfully or already exists.');

      await pool.request().query(createAdvisorInfoTable);
      console.log('Advisor info table created successfully or already exists.');
    } catch (error) {
      console.error('Error creating tables:', error.message);
    }
  }
}
