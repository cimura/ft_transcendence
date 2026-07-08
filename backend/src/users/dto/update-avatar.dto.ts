import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class UpdateAvatarDto {
    avatarUrl: string;
}
