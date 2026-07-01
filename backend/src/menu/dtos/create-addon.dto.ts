import { IsString, IsNumber, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateAddonDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  price: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
