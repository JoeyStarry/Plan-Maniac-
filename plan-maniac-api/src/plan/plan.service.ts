import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlanService {
  constructor(private prisma: PrismaService) {}

  create(userId: string, createPlanDto: CreatePlanDto) {
    return this.prisma.plan.create({
      data: {
        ...createPlanDto,
        userId,
      },
    });
  }

  findAll(userId: string, date?: string) {
    const where: any = { userId };
    if (date) {
      where.date = date;
    }
    return this.prisma.plan.findMany({
      where,
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const plan = await this.prisma.plan.findFirst({
      where: { id, userId },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    return plan;
  }

  async update(id: string, userId: string, updatePlanDto: UpdatePlanDto) {
    await this.findOne(id, userId); // Ensure it exists and belongs to user

    return this.prisma.plan.update({
      where: { id },
      data: updatePlanDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Ensure it exists and belongs to user

    return this.prisma.plan.delete({
      where: { id },
    });
  }

  async reorder(userId: string, date: string, orderData: { id: string; order: number }[]) {
    const updates = orderData.map(item =>
      this.prisma.plan.updateMany({
        where: { id: item.id, userId, date },
        data: { order: item.order },
      })
    );

    return this.prisma.$transaction(updates);
  }
}
