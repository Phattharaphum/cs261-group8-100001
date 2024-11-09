import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as sql from 'mysql2/promise';

@Injectable()
export class AdvisorService {
  private pool: sql.Pool;

  constructor() {
    this.pool = sql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD || 'YourStrong!Passw0rd',
      database: process.env.DB_NAME || 'db01',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  async getAdvisorPetitions(advisorId: string) {
    if (!advisorId) throw new UnauthorizedException('Advisor ID is required');

    const query = `
      SELECT p.*
      FROM petition p
      JOIN advisor_info a ON p.student_id = a.student_id
      WHERE a.advisor_id = ? AND p.status = 2
    `;

    const [rows] = await this.pool.execute(query, [advisorId]);
    return rows;
  }
}
