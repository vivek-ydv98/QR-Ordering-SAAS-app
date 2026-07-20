import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { CategoriesService } from '../services/categories.service';
import { CreateCategoryDto } from '../dtos/create-category.dto';
import { UpdateCategoryDto } from '../dtos/update-category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles('RESTAURANT_ADMIN', 'MANAGER')
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @Roles('RESTAURANT_ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN_STAFF', 'WAITER')
  findAll() {
    return this.categoriesService.findAll();
  }

  @Patch('sort')
  @Roles('RESTAURANT_ADMIN', 'MANAGER')
  sort(@Body('ids') ids: string[]) {
    return this.categoriesService.sort(ids);
  }

  @Get(':id')
  @Roles('RESTAURANT_ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN_STAFF', 'WAITER')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @Roles('RESTAURANT_ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @Roles('RESTAURANT_ADMIN')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
