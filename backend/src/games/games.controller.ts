import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GamesService } from './games.service';

@ApiTags('games')
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  @ApiOperation({ summary: 'ゲーム一覧を取得' })
  @ApiResponse({ status: 200, description: '成功時' })
  findAll() {
    return this.gamesService.findAll();
  }

  @Get('bomberman')
  @ApiOperation({ summary: 'ボンバーマンのゲーム設定を取得' })
  @ApiResponse({ status: 200, description: '成功時' })
  findBomberman() {
    return this.gamesService.findBomberman();
  }
}
