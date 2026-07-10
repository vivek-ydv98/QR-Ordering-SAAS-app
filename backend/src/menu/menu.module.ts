import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { CategoriesController } from './controllers/categories.controller';
import { MenuItemsController } from './controllers/menu-items.controller';
import { VariantsController } from './controllers/variants.controller';
import { AddonsController } from './controllers/addons.controller';
import { CategoriesService } from './services/categories.service';
import { MenuItemsService } from './services/menu-items.service';
import { VariantsService } from './services/variants.service';
import { AddonsService } from './services/addons.service';

@Module({
  imports: [CloudinaryModule],
  controllers: [
    CategoriesController,
    MenuItemsController,
    VariantsController,
    AddonsController,
  ],
  providers: [
    PrismaService,
    CategoriesService,
    MenuItemsService,
    VariantsService,
    AddonsService,
  ],
  exports: [
    CategoriesService,
    MenuItemsService,
    VariantsService,
    AddonsService,
  ],
})
export class MenuModule {}
