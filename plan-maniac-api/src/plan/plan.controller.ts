import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { PlanService } from './plan.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('plans')
@UseGuards(JwtAuthGuard)
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post()
  create(@Request() req, @Body() createPlanDto: CreatePlanDto) {
    return this.planService.create(req.user.id, createPlanDto);
  }

  @Get()
  findAll(@Request() req, @Query('date') date?: string) {
    return this.planService.findAll(req.user.id, date);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.planService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() updatePlanDto: UpdatePlanDto) {
    return this.planService.update(id, req.user.id, updatePlanDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.planService.remove(id, req.user.id);
  }

  @Post('reorder')
  reorder(@Request() req, @Body() body: { date: string; orderData: { id: string; order: number }[] }) {
    return this.planService.reorder(req.user.id, body.date, body.orderData);
  }
}
