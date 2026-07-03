import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ScoresService } from './scores.service';
import {
  MatchHistoryQueryDto,
  MatchHistoryResponseDto,
} from './dto/match-history.dto';

@Controller('scores')
@ApiTags('scores')
@ApiUnauthorizedResponse({ description: '認証失敗時（未ログイン）' })
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'ユーザーの対戦履歴を取得' })
  @ApiOkResponse({
    description: '成功時',
    type: MatchHistoryResponseDto,
  })
  getMatchHistory(
    @Param('userId') userId: string,
    @Query() query: MatchHistoryQueryDto,
  ): Promise<MatchHistoryResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return this.scoresService.getMatchHistory(userId, page, limit);
  }
}
