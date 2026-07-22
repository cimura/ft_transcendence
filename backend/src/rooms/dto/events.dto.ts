import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class RoomJoinDto {
  @IsUUID()
  @IsNotEmpty()
  roomId!: string;
}

export class ChatJoinDto {
  @IsUUID()
  @IsNotEmpty()
  roomId!: string;
}

export class ChatLeaveDto {
  @IsUUID()
  @IsNotEmpty()
  roomId!: string;
}

export class ChatMessageDto {
  @IsUUID()
  @IsNotEmpty()
  roomId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  text!: string;
}
