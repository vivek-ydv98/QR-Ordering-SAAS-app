import { IsString, IsNumber, IsOptional, IsBoolean, IsInt, Min, MaxLength } from 'class-validator';

export class CreateVariantDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  price: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
