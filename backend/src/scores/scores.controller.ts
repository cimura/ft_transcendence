import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ScoresService } from './scores.service';
import { MatchHistoryResponseDto } from './dto/match-history.dto';

@Controller('scores')
@ApiTags('scores')
@ApiUnauthorizedResponse({ description: '認証失敗時（未ログイン）' })
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'ユーザーの対戦履歴を取得' })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: 'ページ番号',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 20,
    description: '１ページあたりの取得件数',
  })
  @ApiOkResponse({
    description: '成功時',
    type: MatchHistoryResponseDto,
  })
  getMatchHistory(
    @Param('userId') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): MatchHistoryResponseDto {
    return this.scoresService.getMatchHistory(
      userId,
      Number(page),
      Number(limit),
    );
  }
}
