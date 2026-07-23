import { Catch, ArgumentsHost, Logger, ExceptionFilter } from '@nestjs/common';
import { GameSocket } from './game.types';

const SAFE_GAME_ERROR_MESSAGE = 'ゲーム処理中にエラーが発生しました。';

@Catch()
export class GameExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GameExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<GameSocket>();
    const internalMessage =
      exception instanceof Error ? exception.message : String(exception);

    this.logger.warn(
      `WebSocket Error: ${internalMessage} { socketId: '${client.id}' }`,
      exception instanceof Error ? exception.stack : undefined,
    );

    client.emit('game:error', { message: SAFE_GAME_ERROR_MESSAGE });
  }
}
