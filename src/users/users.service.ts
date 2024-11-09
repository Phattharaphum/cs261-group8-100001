import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UserService {
  private pool: mysql.Pool;

  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD || 'YourStrong!Passw0rd',
      database: process.env.DB_NAME || 'db01',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  async getAllUsers(): Promise<any[]> {
    try {
      const [rows] = await this.pool.query<any[]>('SELECT * FROM users');
      return rows;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getStudents(): Promise<any[]> {
    try {
      const [rows] = await this.pool.query<any[]>(
        'SELECT * FROM users WHERE userType = ?',
        ['student'],
      );
      return rows;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getTeachers(): Promise<any[]> {
    try {
      const [rows] = await this.pool.query<any[]>(
        'SELECT * FROM users WHERE userType = ?',
        ['teacher'],
      );
      return rows;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async createUser(user: CreateUserDto): Promise<mysql.OkPacket> {
    const { name, email } = user;
    try {
      const [result] = await this.pool.execute<mysql.OkPacket>(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        [name, email],
      );
      return result;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async updateUser(id: number, user: UpdateUserDto): Promise<mysql.OkPacket> {
    const { name, email } = user;
    try {
      const [result] = await this.pool.execute<mysql.OkPacket>(
        'UPDATE users SET name = ?, email = ? WHERE id = ?',
        [name, email, id],
      );
      return result;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteUser(id: number): Promise<mysql.OkPacket> {
    try {
      const [result] = await this.pool.execute<mysql.OkPacket>(
        'DELETE FROM users WHERE id = ?',
        [id],
      );
      return result;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
}
