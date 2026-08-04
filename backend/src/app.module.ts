import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './env.validation';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';
import { FriendsModule } from './friends/friends.module';
import { GameModule } from './game/game.module';
import { ScoresModule } from './scores/scores.module';
import { GamesModule } from './games/games.module';
import { RoomsModule } from './rooms/rooms.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AppWebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate, // 環境変数の検証関数を指定
    }),
    PrismaModule,
    AuthModule,
    UploadsModule,
    UsersModule,
    FriendsModule,
    GameModule,
    ScoresModule,
    GamesModule,
    RoomsModule,
    NotificationsModule,
    AppWebsocketModule,
  ],
})
export class AppModule {}
