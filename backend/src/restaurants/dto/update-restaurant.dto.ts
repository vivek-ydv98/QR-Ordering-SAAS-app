import { IsBoolean, IsEmail, IsOptional, IsString, IsInt, Min } from 'class-validator';

export class UpdateRestaurantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  ownerName?: string;

  @IsEmail()
  @IsOptional()
  ownerEmail?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  subscriptionStatus?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxTables?: number;

  @IsString()
  @IsOptional()
  qrFgColor?: string;

  @IsString()
  @IsOptional()
  qrBgColor?: string;

  @IsString()
  @IsOptional()
  qrLogoUrl?: string;
}
