import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { MenuItemsService } from '../menu/services/menu-items.service';
import { CategoriesService } from '../menu/services/categories.service';
import { FileValidationPipe } from '../common/pipes/file-validation.pipe';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Request } from 'express';

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly restaurantsService: RestaurantsService,
    private readonly menuItemsService: MenuItemsService,
    private readonly categoriesService: CategoriesService,
  ) {}

  @Post('restaurant/:id/logo')
  @Roles('SUPER_ADMIN', 'RESTAURANT_ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  async uploadRestaurantLogo(
    @Param('id') id: string,
    @UploadedFile(new FileValidationPipe()) file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const restaurant = await this.restaurantsService.getRestaurantById(id);
    const folder = `restaurants/${restaurant.slug}/logo`;
    const result = await this.cloudinaryService.uploadImage(file, folder);
    const updated = await this.restaurantsService.updateRestaurant(id, {
      logoUrl: result.secure_url,
      logoPublicId: result.public_id,
    });
    return { secure_url: result.secure_url, public_id: result.public_id };
  }

  @Post('menu-item/:id/image')
  @Roles('RESTAURANT_ADMIN', 'MANAGER')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMenuItemImage(
    @Param('id') id: string,
    @UploadedFile(new FileValidationPipe()) file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;
    const restaurant = await this.restaurantsService.getRestaurantById(user.restaurantId);
    const folder = `restaurants/${restaurant.slug}/menu-items`;
    const result = await this.cloudinaryService.uploadImage(file, folder);
    const updated = await this.menuItemsService.update(id, {
      imageUrl: result.secure_url,
      imagePublicId: result.public_id,
    });
    return { secure_url: result.secure_url, public_id: result.public_id };
  }

  @Delete('menu-item/:id/image')
  @Roles('RESTAURANT_ADMIN', 'MANAGER')
  async deleteMenuItemImage(
    @Param('id') id: string,
  ) {
    const updated = await this.menuItemsService.removeImage(id);
    return { message: 'Image removed successfully' };
  }

  @Post('category/:id/image')
  @Roles('RESTAURANT_ADMIN', 'MANAGER')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCategoryImage(
    @Param('id') id: string,
    @UploadedFile(new FileValidationPipe()) file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;
    const restaurant = await this.restaurantsService.getRestaurantById(user.restaurantId);
    const folder = `restaurants/${restaurant.slug}/categories`;
    const result = await this.cloudinaryService.uploadImage(file, folder);
    const updated = await this.categoriesService.update(id, {
      imageUrl: result.secure_url,
      imagePublicId: result.public_id,
    });
    return { secure_url: result.secure_url, public_id: result.public_id };
  }

  @Post('settings/qr-logo')
  @Roles('RESTAURANT_ADMIN', 'MANAGER')
  @UseInterceptors(FileInterceptor('file'))
  async uploadQrLogo(
    @UploadedFile(new FileValidationPipe()) file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;
    const restaurant = await this.restaurantsService.getRestaurantById(user.restaurantId);
    const folder = `restaurants/${restaurant.slug}/settings`;
    const result = await this.cloudinaryService.uploadImage(file, folder);
    const updated = await this.restaurantsService.updateRestaurantSettingsQrLogo(
      user.restaurantId,
      result.secure_url,
      result.public_id,
    );
    return { secure_url: result.secure_url, public_id: result.public_id };
  }
}
