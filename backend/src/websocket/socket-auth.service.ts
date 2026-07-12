import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

export type SocketUser = {
  id: string;
};

@Injectable()
export class SocketAuthService {
  constructor(private readonly jwtService: JwtService) {}

  authenticate(client: Socket): SocketUser | null {
    const token = this.extractBearerToken(client.handshake.auth.token);
    if (!token) return null;

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      return { id: payload.sub };
    } catch {
      return null;
    }
  }

  private extractBearerToken(value: unknown) {
    if (typeof value !== 'string') return null;
    if (!value.startsWith('Bearer ')) return null;
    return value.slice('Bearer '.length);
  }
}
