import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { MenuItemsService } from '../services/menu-items.service';
import { CreateMenuItemDto } from '../dtos/create-menu-item.dto';
import { UpdateMenuItemDto } from '../dtos/update-menu-item.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('menu-items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Post()
  @Roles('RESTAURANT_ADMIN', 'MANAGER')
  create(@Body() createMenuItemDto: CreateMenuItemDto) {
    return this.menuItemsService.create(createMenuItemDto);
  }

  @Get()
  @Roles('RESTAURANT_ADMIN', 'MANAGER')
  findAll(@Query('categoryId') categoryId?: string) {
    return this.menuItemsService.findAll(categoryId);
  }

  @Get(':id')
  @Roles('RESTAURANT_ADMIN', 'MANAGER')
  findOne(@Param('id') id: string) {
    return this.menuItemsService.findOne(id);
  }

  @Patch(':id')
  @Roles('RESTAURANT_ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() updateMenuItemDto: UpdateMenuItemDto) {
    return this.menuItemsService.update(id, updateMenuItemDto);
  }

  @Delete(':id')
  @Roles('RESTAURANT_ADMIN')
  remove(@Param('id') id: string) {
    return this.menuItemsService.remove(id);
  }
}
