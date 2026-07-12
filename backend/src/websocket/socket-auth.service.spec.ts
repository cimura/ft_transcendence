import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { SocketAuthService } from './socket-auth.service';

const createSocket = (token: unknown): Socket =>
  ({
    handshake: {
      auth: { token },
    },
  }) as unknown as Socket;

describe('SocketAuthService', () => {
  let service: SocketAuthService;
  let jwtService: { verify: jest.Mock };

  beforeEach(() => {
    jwtService = { verify: jest.fn() };
    service = new SocketAuthService(jwtService as unknown as JwtService);
  });

  it('returns null when no token is provided', () => {
    const client = createSocket(undefined);

    expect(service.authenticate(client)).toBeNull();
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('returns null when the token does not use the Bearer scheme', () => {
    const client = createSocket('some-raw-token');

    expect(service.authenticate(client)).toBeNull();
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('returns null when the token is not a string', () => {
    const client = createSocket(12345);

    expect(service.authenticate(client)).toBeNull();
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('returns the authenticated user when the Bearer token is valid', () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1' });
    const client = createSocket('Bearer valid-token');

    const result = service.authenticate(client);

    expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
    expect(result).toEqual({ id: 'user-1' });
  });

  it('returns null when jwtService.verify throws', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const client = createSocket('Bearer invalid-token');

    expect(service.authenticate(client)).toBeNull();
  });
});