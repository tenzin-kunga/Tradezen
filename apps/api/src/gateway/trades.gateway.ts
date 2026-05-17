import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/realtime',
})
export class TradesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('TradesGateway');

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.query.token as string;
    if (!token) {
      this.logger.warn('Connection rejected: no token');
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      client.data.userId = userId;
      client.join(`user:${userId}`);
      this.logger.log(`Client connected: user ${userId}`);
    } catch {
      this.logger.warn('Connection rejected: invalid JWT');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToAll(event: string, data: unknown) {
    this.server.emit(event, data);
  }
}
