import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional, IsInt, Min, IsNumber, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CustomizationDto {
  @IsString({ message: 'Customization option name must be a string' })
  @IsNotEmpty({ message: 'Customization option name cannot be empty' })
  optionName: string;

  @IsNumber({}, { message: 'Customization option price must be a number' })
  @IsOptional()
  price?: number;
}

export class OrderItemDto {
  @IsString({ message: 'Menu item ID must be a string' })
  @IsNotEmpty({ message: 'Menu item ID is required' })
  menuItemId: string;

  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;

  @IsArray({ message: 'Customizations must be an array' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CustomizationDto)
  customizations?: CustomizationDto[];
}

export class CreateOrderDto {
  @IsString({ message: 'Table ID must be a string' })
  @IsNotEmpty({ message: 'Table ID is required' })
  tableId: string;

  @IsArray({ message: 'Items must be an array' })
  @ArrayNotEmpty({ message: 'Items cannot be empty' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString({ message: 'Special instructions must be a string' })
  @IsOptional()
  specialInstructions?: string;
}
