import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsInt, Min, MaxLength } from 'class-validator';
import { FoodType } from '@prisma/client';

export class CreateMenuItemDto {
  @IsString()
  categoryId: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  price: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  discountPrice?: number;

  @IsBoolean()
  @IsOptional()
  isVeg?: boolean;

  @IsEnum(FoodType)
  @IsOptional()
  foodType?: FoodType;

  @IsInt()
  @Min(1)
  @IsOptional()
  prepTime?: number;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsBoolean()
  @IsOptional()
  isBestseller?: boolean;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
