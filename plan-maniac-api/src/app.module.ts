import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PlanModule } from './plan/plan.module';
import { CategoryModule } from './category/category.module';
import { UserModule } from './user/user.module';
import { PointsModule } from './points/points.module';

@Module({
  imports: [PrismaModule, AuthModule, PlanModule, CategoryModule, UserModule, PointsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
