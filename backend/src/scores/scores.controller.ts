import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ScoreService } from './scores.service';
import { MatchHistoryResponseDto } from './dto/match-history.dto';

@Controller('score')
@ApiTags('score')
@ApiUnauthorizedResponse({ description: '認証失敗時（未ログイン）' })
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ScoreController {
  constructor(private readonly scoreService: ScoreService) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'ユーザーの対戦履歴を取得' })
  @ApiOkResponse({
    description: '成功時',
    type: MatchHistoryResponseDto,
  })
  getMatchHistory(
    @Param('userId') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): MatchHistoryResponseDto {
    return this.scoreService.getMatchHistory(
      userId,
      Number(page),
      Number(limit),
    );
  }
}
