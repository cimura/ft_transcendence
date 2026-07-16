import { Catch, ArgumentsHost, Logger, ExceptionFilter } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { GameSocket } from './game.types';

@Catch()
export class GameExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GameExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<GameSocket>();

    let message = 'An unexpected error occurred';

    if (exception instanceof WsException) {
      const errorData = exception.getError();

      if (typeof errorData === 'string') {
        message = errorData;
      } else if (
        typeof errorData === 'object' &&
        errorData !== null &&
        'message' in errorData
      ) {
        message = String(errorData.message);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.warn(
      `WebSocket Error: ${message} { socketId: '${client.id}' }`,
    );

    client.emit('game:error', { message });
  }
}
