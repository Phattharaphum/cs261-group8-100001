import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as sql from 'mssql';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private pool: sql.ConnectionPool;

  constructor(
    private readonly jwtService: JwtService,
    private configService: ConfigService,
  ) {
    const dbConfig = this.configService.get('database');
    this.pool = new sql.ConnectionPool(dbConfig);
  }

  async validateUser(username: string, password: string): Promise<any> {
    try {
      await this.pool.connect();

      // Query the database for the user
      const query = `
        SELECT id, username, userType
        FROM users
        WHERE username = @username AND password = @password
      `;

      const result = await this.pool
        .request()
        .input('username', sql.NVarChar, username)
        .input('password', sql.NVarChar, password) // Assuming passwords are stored as plain text (you should hash passwords in production)
        .query(query);

      // Check if a user was found
      if (result.recordset.length > 0) {
        const user = result.recordset[0];
        return user; // Return user details without the password
      }

      return null; // No user found, return null
    } catch (error) {
      console.error('Database error during user validation:', error.message);
      throw new UnauthorizedException('Database error during login');
    } finally {
      this.pool.close();
    }
  }

  async login(user: any) {
    const payload = {
      username: user.username,
      sub: user.id,
      userType: user.userType,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
