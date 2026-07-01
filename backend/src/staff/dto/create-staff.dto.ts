import { IsEmail, IsNotEmpty, IsOptional, IsString, IsBoolean, MinLength } from 'class-validator';

export class CreateStaffDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName: string;

  @IsString()
  @IsNotEmpty({ message: 'Role is required' })
  role: string; // e.g. MANAGER, CASHIER, KITCHEN_STAFF, WAITER

  @IsString()
  @IsOptional()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password?: string;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
