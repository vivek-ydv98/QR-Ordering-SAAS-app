import { Module } from '@nestjs/common';
import { CloudinaryModule } from './cloudinary.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { MenuModule } from '../menu/menu.module';
import { UploadController } from './upload.controller';

@Module({
  imports: [CloudinaryModule, RestaurantsModule, MenuModule],
  controllers: [UploadController],
})
export class UploadModule {}
