import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, { message: 'Status must be a valid OrderStatus value' })
  @IsNotEmpty({ message: 'Status is required' })
  status: OrderStatus;
}
