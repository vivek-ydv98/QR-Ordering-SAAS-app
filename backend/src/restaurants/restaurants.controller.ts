import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Request } from 'express';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) { }

  // ─── SUPER ADMIN MANAGEMENT ENDPOINTS ─────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  getAllRestaurants() {
    return this.restaurantsService.getAllRestaurants();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  createRestaurant(@Body() createRestaurantDto: CreateRestaurantDto) {
    return this.restaurantsService.createRestaurant(createRestaurantDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  updateRestaurant(
    @Param('id') id: string,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
  ) {
    return this.restaurantsService.updateRestaurant(id, updateRestaurantDto);
  }

  // ─── READ ENDPOINTS ───────────────────────────────────────────────────────────

  @Get('tables/by-id/:tableId')
  getTableById(@Param('tableId') tableId: string) {
    return this.restaurantsService.getTableById(tableId);
  }

  @Get(':slug')
  getRestaurantBySlug(@Param('slug') slug: string) {
    return this.restaurantsService.getRestaurantBySlug(slug);
  }

  @Get('by-id/:id')
  @UseGuards(JwtAuthGuard)
  getRestaurantById(@Param('id') id: string) {
    return this.restaurantsService.getRestaurantById(id);
  }

  /**
   * Admin panel passes ?includeUnavailable=true to see hidden dishes.
   * Customer app calls without the param → only available items are returned.
   */
  @Get(':restaurantId/menu')
  getMenu(
    @Param('restaurantId') restaurantId: string,
    @Query('includeUnavailable') includeUnavailable?: string,
  ) {
    return this.restaurantsService.getMenu(restaurantId, includeUnavailable === 'true');
  }

  @Get(':restaurantId/tables')
  getTables(@Param('restaurantId') restaurantId: string) {
    return this.restaurantsService.getTables(restaurantId);
  }

  // ─── CATEGORY ENDPOINTS ───────────────────────────────────────────────────────

  @Post(':restaurantId/categories')
  createCategory(
    @Param('restaurantId') restaurantId: string,
    @Body() body: { name: string; sortOrder?: number },
  ) {
    return this.restaurantsService.createCategory(restaurantId, body.name, body.sortOrder);
  }

  @Patch('categories/:categoryId')
  updateCategory(
    @Param('categoryId') categoryId: string,
    @Body() body: { name?: string; sortOrder?: number; isAvailable?: boolean },
  ) {
    return this.restaurantsService.updateCategory(categoryId, body);
  }

  @Delete('categories/:categoryId')
  deleteCategory(@Param('categoryId') categoryId: string) {
    return this.restaurantsService.deleteCategory(categoryId);
  }

  // ─── MENU ITEM ENDPOINTS ──────────────────────────────────────────────────────

  @Post(':restaurantId/menu-items')
  createMenuItem(
    @Param('restaurantId') restaurantId: string,
    @Body() body: {
      categoryId: string;
      name: string;
      description: string;
      price: number;
      isVeg?: boolean;
      imageUrl?: string;
    },
  ) {
    return this.restaurantsService.createMenuItem(restaurantId, body);
  }

  @Patch('menu-items/:itemId')
  updateMenuItem(
    @Param('itemId') itemId: string,
    @Body() body: {
      categoryId?: string;
      name?: string;
      description?: string;
      price?: number;
      isVeg?: boolean;
      isAvailable?: boolean;
      imageUrl?: string;
    },
  ) {
    return this.restaurantsService.updateMenuItem(itemId, body);
  }

  @Delete('menu-items/:itemId')
  deleteMenuItem(@Param('itemId') itemId: string) {
    return this.restaurantsService.deleteMenuItem(itemId);
  }

  // ─── TABLE MANAGEMENT ENDPOINTS ────────────────────────────────────────────────

  @Post(':restaurantId/tables')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  createTable(
    @Param('restaurantId') restaurantId: string,
    @Body() body: { name: string },
  ) {
    return this.restaurantsService.createTable(restaurantId, body.name);
  }

  @Delete('tables/:tableId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  deleteTable(@Param('tableId') tableId: string) {
    return this.restaurantsService.deleteTable(tableId);
  }

  @Patch('tables/:tableId')
  @UseGuards(JwtAuthGuard)
  updateTable(
    @Param('tableId') tableId: string,
    @Body() body: { isActive?: boolean; name?: string; status?: any; qrCodeUrl?: string | null },
    @Req() req: Request,
  ) {
    const user = req['user'];
    return this.restaurantsService.updateTable(tableId, body, user);
  }

  @Post(':restaurantId/tables/regenerate-qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  regenerateQrCodes(@Param('restaurantId') restaurantId: string) {
    return this.restaurantsService.bulkRegenerateQrCodes(restaurantId);
  }
}
