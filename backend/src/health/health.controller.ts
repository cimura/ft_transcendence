import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'ヘルスチェック用エンドポイント' })
  @ApiOkResponse({
    description: 'アプリケーションが起動していることを示す',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok'] },
      },
      required: ['status'],
    },
  })
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
