import { IsEmail, IsOptional, IsString, IsBoolean, MinLength } from 'class-validator';

export class UpdateStaffDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  role?: string; // e.g. MANAGER, CASHIER, KITCHEN_STAFF, WAITER

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
