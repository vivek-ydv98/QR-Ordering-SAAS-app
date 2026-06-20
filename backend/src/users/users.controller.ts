import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('restaurants/:id/admin')
  async createAdmin(
    @Param('id') restaurantId: string,
    @Body() createUserDto: CreateUserDto,
  ) {
    createUserDto.role = 'RESTAURANT_ADMIN';
    return this.usersService.createRestaurantAdmin(restaurantId, createUserDto);
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(userId, updateUserDto);
  }

  @Post('users/:id/reset-password')
  async resetPassword(
    @Param('id') userId: string,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(userId, resetPasswordDto.password);
  }

  @Get('audit-logs')
  async getAuditLogs() {
    return this.usersService.getAuditLogs();
  }
}
