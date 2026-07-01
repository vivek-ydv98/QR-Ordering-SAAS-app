import { Module } from '@nestjs/common';
import { KitchenGateway } from './kitchen.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [KitchenGateway],
  exports: [KitchenGateway],
})
export class SocketsModule {}
