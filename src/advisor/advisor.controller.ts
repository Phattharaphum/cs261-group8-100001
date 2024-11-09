import {
  Controller,
  Get,
  UseGuards,
  Req,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdvisorService } from './advisor.service';

@Controller('advisor')
export class AdvisorController {
  constructor(private readonly advisorService: AdvisorService) {}

  @UseGuards(JwtAuthGuard)
  @Get('advisor-petitions')
  async getAdvisorPetitions(@Req() req) {
    const advisorId = req.user?.username; // Assuming the advisor's ID is stored in the token payload

    try {
      const petitions =
        await this.advisorService.getAdvisorPetitions(advisorId);
      return {
        statusCode: HttpStatus.OK,
        data: petitions,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch petitions',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
