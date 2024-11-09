// src/petition/dto/petition.dto.ts

export class CreatePetitionDto {
  student_id: string; // Required field, NVARCHAR(20)
  student_name: string; // Required field, NVARCHAR(100)
  major?: string; // Optional field, NVARCHAR(50)
  year?: number; // Optional field, INT
  address?: string; // Optional field, NVARCHAR(255)
  student_phone?: string; // Optional field, NVARCHAR(15)
  guardian_phone?: string; // Optional field, NVARCHAR(15)
  petition_type?: string; // Optional field, NVARCHAR(50)
  semester?: string; // Optional field, NVARCHAR(20)
  subject_code?: string; // Optional field, NVARCHAR(20)
  subject_name?: string; // Optional field, NVARCHAR(100)
  section?: string; // Optional field, NVARCHAR(10)
  status?: number = 1; // Optional field, TINYINT (default 1)
  submit_time?: Date; // Optional field, DATETIME
  review_time?: Date; // Optional field, DATETIME
}

export class UpdatePetitionDto {
  student_id?: string; // Optional for update
  student_name?: string; // Optional for update
  major?: string; // Optional field, NVARCHAR(50)
  year?: number; // Optional field, INT
  address?: string; // Optional field, NVARCHAR(255)
  student_phone?: string; // Optional field, NVARCHAR(15)
  guardian_phone?: string; // Optional field, NVARCHAR(15)
  petition_type?: string; // Optional field, NVARCHAR(50)
  semester?: string; // Optional field, NVARCHAR(20)
  subject_code?: string; // Optional field, NVARCHAR(20)
  subject_name?: string; // Optional field, NVARCHAR(100)
  section?: string; // Optional field, NVARCHAR(10)
  status?: number; // Optional field, TINYINT
  submit_time?: Date; // Optional field, DATETIME
  review_time?: Date; // Optional field, DATETIME
}
