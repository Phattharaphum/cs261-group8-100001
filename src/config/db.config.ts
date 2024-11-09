import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'YourStrong!Passw0rd',
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  database: process.env.DB_NAME || 'db01',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
}));
