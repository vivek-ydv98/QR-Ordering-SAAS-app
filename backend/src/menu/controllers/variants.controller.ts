import { Controller, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { VariantsService } from '../services/variants.service';
import { CreateVariantDto } from '../dtos/create-variant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Post('menu-items/:itemId/variants')
  @Roles('RESTAURANT_ADMIN')
  create(@Param('itemId') itemId: string, @Body() createVariantDto: CreateVariantDto) {
    return this.variantsService.create(itemId, createVariantDto);
  }

  @Patch('variants/:id')
  @Roles('RESTAURANT_ADMIN')
  update(@Param('id') id: string, @Body() updateVariantDto: Partial<CreateVariantDto>) {
    return this.variantsService.update(id, updateVariantDto);
  }

  @Delete('variants/:id')
  @Roles('RESTAURANT_ADMIN')
  remove(@Param('id') id: string) {
    return this.variantsService.remove(id);
  }
}
