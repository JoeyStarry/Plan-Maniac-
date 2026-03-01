import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PointsService {
  constructor(private prisma: PrismaService) {}

  async getPointsHistory(userId: string) {
    return this.prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addPoints(userId: string, amount: number, reason: string) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    return this.prisma.$transaction(async (prisma) => {
      // 1. Create transaction record
      const transaction = await prisma.pointTransaction.create({
        data: {
          userId,
          amount,
          reason,
        },
      });

      // 2. Update user points
      await prisma.user.update({
        where: { id: userId },
        data: {
          points: {
            increment: amount,
          },
        },
      });

      return transaction;
    });
  }

  async deductPoints(userId: string, amount: number, reason: string) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    return this.prisma.$transaction(async (prisma) => {
      // 1. Check if user has enough points
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.points < amount) {
        throw new BadRequestException('Insufficient points');
      }

      // 2. Create transaction record (negative amount)
      const transaction = await prisma.pointTransaction.create({
        data: {
          userId,
          amount: -amount,
          reason,
        },
      });

      // 3. Update user points
      await prisma.user.update({
        where: { id: userId },
        data: {
          points: {
            decrement: amount,
          },
        },
      });

      return transaction;
    });
  }
}
