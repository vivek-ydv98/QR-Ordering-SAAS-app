import { IsEmail, IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  @IsNotEmpty({ message: 'Restaurant name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Restaurant slug is required' })
  slug: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  ownerName?: string;

  @IsEmail({}, { message: 'Owner email must be a valid email' })
  @IsOptional()
  ownerEmail?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxTables?: number;
}
