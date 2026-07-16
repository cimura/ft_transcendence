import { Catch, ArgumentsHost, Logger, ExceptionFilter } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class GameExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GameExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();

    let message = 'An unexpected error occurred';

    if (exception instanceof WsException) {
      const errorData = exception.getError();
      message =
        typeof errorData === 'string'
          ? errorData
          : (errorData as any).message || message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.warn(
      `WebSocket Error: ${message} { socketId: '${client.id}' }`,
    );

    client.emit('game:error', { message });
  }
}
