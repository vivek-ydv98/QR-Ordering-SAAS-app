import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Request } from 'express';

@Controller('staff')
@UseGuards(JwtAuthGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  // ─── SELF PROFILE ENDPOINTS ───────────────────────────────────────────────────

  @Get('profile/me')
  async getProfile(@Req() req: Request) {
    const user = req.user as any;
    return this.staffService.getProfile(user.id);
  }

  @Patch('profile/me')
  async updateProfile(
    @Req() req: Request,
    @Body() body: { fullName?: string; email?: string; password?: string },
  ) {
    const user = req.user as any;
    return this.staffService.updateProfile(user.id, body);
  }

  // ─── STAFF MANAGEMENT ENDPOINTS (ADMIN & MANAGER SCOPE) ───────────────────────

  @Get()
  @UseGuards(RolesGuard)
  @Roles('RESTAURANT_ADMIN', 'MANAGER')
  async findAll() {
    return this.staffService.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('RESTAURANT_ADMIN', 'MANAGER')
  async create(@Body() createStaffDto: CreateStaffDto, @Req() req: Request) {
    const user = req.user as any;
    return this.staffService.create(createStaffDto, user.role);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('RESTAURANT_ADMIN', 'MANAGER')
  async update(
    @Param('id') id: string,
    @Body() updateStaffDto: UpdateStaffDto,
  ) {
    return this.staffService.update(id, updateStaffDto);
  }

  @Post(':id/reset-password')
  @UseGuards(RolesGuard)
  @Roles('RESTAURANT_ADMIN', 'MANAGER')
  async resetPassword(
    @Param('id') id: string,
    @Body() body?: { password?: string },
  ) {
    return this.staffService.resetPassword(id, body?.password);
  }

  @Get(':id/activity')
  @UseGuards(RolesGuard)
  @Roles('RESTAURANT_ADMIN', 'MANAGER')
  async getActivity(@Param('id') id: string) {
    return this.staffService.getActivity(id);
  }
}
