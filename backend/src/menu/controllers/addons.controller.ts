import { Controller, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AddonsService } from '../services/addons.service';
import { CreateAddonDto } from '../dtos/create-addon.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AddonsController {
  constructor(private readonly addonsService: AddonsService) {}

  @Post('menu-items/:itemId/addons')
  @Roles('RESTAURANT_ADMIN')
  create(@Param('itemId') itemId: string, @Body() createAddonDto: CreateAddonDto) {
    return this.addonsService.create(itemId, createAddonDto);
  }

  @Patch('addons/:id')
  @Roles('RESTAURANT_ADMIN')
  update(@Param('id') id: string, @Body() updateAddonDto: Partial<CreateAddonDto>) {
    return this.addonsService.update(id, updateAddonDto);
  }

  @Delete('addons/:id')
  @Roles('RESTAURANT_ADMIN')
  remove(@Param('id') id: string) {
    return this.addonsService.remove(id);
  }
}
