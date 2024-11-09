import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpStatus,
  UseGuards,
  HttpException,
} from '@nestjs/common';
import { UserService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StudentGuard } from '../auth/student.guard';
import { TeacherGuard } from '../auth/teacher.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  // Public route for all authenticated users
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllUsers() {
    try {
      const users = await this.userService.getAllUsers();
      return {
        statusCode: HttpStatus.OK,
        data: users,
      };
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Route restricted to students only
  @UseGuards(JwtAuthGuard, StudentGuard)
  @Get('student')
  async getStudentInfo() {
    try {
      const students = await this.userService.getStudents();
      return {
        statusCode: HttpStatus.OK,
        data: students,
      };
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Route restricted to teachers only
  @UseGuards(JwtAuthGuard, TeacherGuard)
  @Get('teacher')
  async getTeacherInfo() {
    try {
      const teachers = await this.userService.getTeachers();
      return {
        statusCode: HttpStatus.OK,
        data: teachers,
      };
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Accessible by authenticated users for creating new users
  @UseGuards(JwtAuthGuard)
  @Post()
  async createUser(@Body() user: { name: string; email: string }) {
    try {
      const result = await this.userService.createUser(user);
      return {
        statusCode: HttpStatus.CREATED,
        data: result,
      };
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Accessible by authenticated users for updating users
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateUser(
    @Param('id') id: number,
    @Body() user: { name?: string; email?: string },
  ) {
    try {
      const result = await this.userService.updateUser(id, user);
      return {
        statusCode: HttpStatus.OK,
        data: result,
      };
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Accessible by authenticated users for deleting users
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteUser(@Param('id') id: number) {
    try {
      const result = await this.userService.deleteUser(id);
      return {
        statusCode: HttpStatus.OK,
        data: result,
      };
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
