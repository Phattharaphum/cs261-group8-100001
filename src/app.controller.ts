import {
  Controller,
  Get,
  Post,
  Body,
  HttpStatus,
  HttpException,
} from '@nestjs/common';

@Controller('api')
export class AppController {
  @Get('get-api-key')
  getApiKey() {
    const apiKey = 'your-api-key'; // Replace with actual logic to retrieve the API key
    return {
      statusCode: HttpStatus.OK,
      apiKey,
    };
  }

  @Post('login')
  async login(@Body() credentials: { username: string; password: string }) {
    const { username, password } = credentials;

    // Placeholder login logic - replace with real authentication
    if (username === 'test' && password === 'password') {
      return {
        statusCode: HttpStatus.OK,
        success: true,
        redirectUrl: '/dashboard',
      };
    } else {
      throw new HttpException(
        {
          statusCode: HttpStatus.UNAUTHORIZED,
          success: false,
          message: 'Invalid credentials',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
