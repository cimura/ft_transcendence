import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
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
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<MatchHistoryResponseDto> {
    const maxPage = 10000;
    const maxLimit = 100;

    if (page < 1 || page > maxPage) {
      throw new BadRequestException(`page must be between 1 and ${maxPage}`);
    }
    if (limit < 1 || limit > maxLimit) {
      throw new BadRequestException(`limit must be between 1 and ${maxLimit}`);
    }

    return this.scoresService.getMatchHistory(userId, page, limit);
  }
}
