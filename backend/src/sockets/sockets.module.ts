import { Module } from '@nestjs/common';
import { KitchenGateway } from './kitchen.gateway';
import { AuthModule } from '../auth/auth.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';

@Module({
  imports: [AuthModule, RestaurantsModule],
  providers: [KitchenGateway],
  exports: [KitchenGateway],
})
export class SocketsModule {}
