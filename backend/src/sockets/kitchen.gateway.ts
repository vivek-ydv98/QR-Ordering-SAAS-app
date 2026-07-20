import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseFilters, UseGuards, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RestaurantsService } from '../restaurants/restaurants.service';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/',
})
export class KitchenGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly restaurantsService: RestaurantsService,
  ) {}

  // Track socket connections security parameters
  async handleConnection(client: Socket) {
    const tenantId = client.handshake.query.tenantId as string;
    const authHeader = client.handshake.headers.authorization;

    // 1. Enforce validation of basic parameters
    if (!tenantId) {
      console.warn(`[Socket Rejected] Missing tenantId param in connection from: ${client.id}`);
      client.disconnect(true);
      return;
    }

    // Bind metadata scope directly to the socket connection thread
    client.data = {
      tenantId,
      authenticated: false,
    };

    // 2. Verify JWT token if provided
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = this.jwtService.verify(token);
        client.data.authenticated = true;
        client.data.userId = payload.sub;
        client.data.role = payload.role;
        console.log(`[Socket Auth] Verified: user ${payload.sub} role=${payload.role} tenant=${tenantId}`);
      } catch (err) {
        console.warn(`[Socket Rejected] Invalid JWT from client ${client.id}: ${(err as Error).message}`);
        client.disconnect(true);
        return;
      }
    }

    console.log(`[Socket Connected] ID: ${client.id} | tenantId: ${tenantId} | authenticated: ${client.data.authenticated}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[Socket Disconnected] Client ID: ${client.id}`);
  }

  /**
   * Safe room joining handler
   */
  @SubscribeMessage('room:join')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string }
  ) {
    const tenantId = client.data.tenantId;

    // Security Gate: Ensure client only requests rooms matching their connection tenant scope
    const isTargetingCorrectTenant = data.room.startsWith(`tenant:${tenantId}`) || data.room.startsWith(`room:join-table`);
    
    if (!isTargetingCorrectTenant) {
      console.warn(`[Security Alert] Client ${client.id} attempted to join unauthorized room: ${data.room}`);
      return { event: 'error', data: 'Access Denied: Room isolation breach.' };
    }

    client.join(data.room);
    console.log(`[Socket Room] Client ${client.id} joined channel: ${data.room}`);
    return { event: 'joined', data: data.room };
  }

  /**
   * Leave room handler
   */
  @SubscribeMessage('room:leave')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string }
  ) {
    client.leave(data.room);
    console.log(`[Socket Room] Client ${client.id} left channel: ${data.room}`);
    return { event: 'left', data: data.room };
  }

  /**
   * Propagate new order events to the KDS room within the tenant boundary
   */
  @SubscribeMessage('order:create')
  handleOrderCreate(
    @ConnectedSocket() client: Socket,
    @MessageBody() orderPayload: any
  ) {
    const tenantId = client.data.tenantId;

    // Enforce tenant boundary check on data payload
    if (orderPayload.tenantId !== tenantId) {
      console.warn(`[Security Alert] Client ${client.id} attempted to inject cross-tenant order.`);
      return;
    }

    // Broadcast to KDS / Admin dashboards inside the tenant room
    const targetRoom = `tenant:${tenantId}`;
    this.server.to(targetRoom).emit('order:create', orderPayload);
    console.log(`[Socket Emit] Order ${orderPayload.orderId} broadcast to channel: ${targetRoom}`);
  }

  /**
   * Propagate order status updates to table rooms
   */
  @SubscribeMessage('order_status_update')
  handleStatusUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { orderId: string; status: string }
  ) {
    const tenantId = client.data.tenantId;
    const targetRoom = `tenant:${tenantId}`;

    // Broadcast update details
    this.server.to(targetRoom).emit('order_status_update', payload);
  }

  /**
   * Handle guest assistance calls (waiter chimes)
   */
  @SubscribeMessage('waiter:call')
  handleWaiterCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() callPayload: any
  ) {
    const tenantId = client.data.tenantId;

    if (callPayload.tenantId !== tenantId) {
      console.warn(`[Security Alert] Client ${client.id} attempted to inject cross-tenant waiter call.`);
      return;
    }

    // Save active call in memory
    this.restaurantsService.addWaiterCall(tenantId, callPayload);

    // Broadcast alert to floor staff rooms
    const targetRoom = `tenant:${tenantId}`;
    this.server.to(targetRoom).emit('waiter:call', callPayload);
    console.log(`[Socket Emit] Assistance request from table ${callPayload.tableName} sent to room: ${targetRoom}`);
  }

  @SubscribeMessage('waiter:resolve')
  handleWaiterResolve(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { id: string; tenantId: string }
  ) {
    const tenantId = client.data.tenantId;

    if (payload.tenantId !== tenantId) {
      console.warn(`[Security Alert] Client ${client.id} attempted to inject cross-tenant waiter call resolution.`);
      return;
    }

    // Remove active call from memory
    this.restaurantsService.resolveWaiterCall(tenantId, payload.id);

    // Broadcast resolution to floor staff rooms
    const targetRoom = `tenant:${tenantId}`;
    this.server.to(targetRoom).emit('waiter:resolve', payload);
    console.log(`[Socket Emit] Assistance request resolved: ${payload.id} sent to room: ${targetRoom}`);
  }
}
