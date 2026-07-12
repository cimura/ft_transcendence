import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class SelectDefaultAvatarDto {
  @ApiProperty({
    example: '/avatars/default-1.svg',
    description: 'デフォルトアバター画像のURL',
  })
  @IsString()
  @Matches(/^\/avatars\/default-[1-5]\.svg$/, {
    message: 'avatarUrl must be one of the default avatar paths',
  })
  avatarUrl: string;
}
