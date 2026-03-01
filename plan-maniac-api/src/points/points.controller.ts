import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { PointsService } from './points.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('points')
@UseGuards(JwtAuthGuard)
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('history')
  getPointsHistory(@Request() req) {
    return this.pointsService.getPointsHistory(req.user.id);
  }

  @Post('add')
  addPoints(@Request() req, @Body() body: { amount: number; reason: string }) {
    return this.pointsService.addPoints(req.user.id, body.amount, body.reason);
  }

  @Post('deduct')
  deductPoints(@Request() req, @Body() body: { amount: number; reason: string }) {
    return this.pointsService.deductPoints(req.user.id, body.amount, body.reason);
  }
}
