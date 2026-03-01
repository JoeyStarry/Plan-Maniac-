import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  getProfile(@Request() req) {
    return this.userService.getProfile(req.user.id);
  }

  @Patch('profile')
  updateProfile(
    @Request() req,
    @Body() updateData: { nickname?: string; avatar?: string; signature?: string },
  ) {
    return this.userService.updateProfile(req.user.id, updateData);
  }
}
