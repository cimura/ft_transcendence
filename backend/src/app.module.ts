import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './env.validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma.service';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';
import { FriendsModule } from './friends/friends.module';
import { GameGateway } from './game/game.gateway';
import { GameModule } from './game/game.module';
import { ScoresModule } from './scores/scores.module';
import { GamesModule } from './games/games.module';
import { RoomsModule } from './rooms/rooms.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate, // 環境変数の検証関数を指定
    }),
    AuthModule,
    UploadsModule,
    UsersModule,
    FriendsModule,
    GameModule,
    ScoresModule,
    GamesModule,
    RoomsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, GameGateway],
})
export class AppModule {}
