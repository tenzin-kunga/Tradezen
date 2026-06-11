import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'Google ID token (credential) from Google Identity Services',
  })
  @IsString()
  @MinLength(10)
  credential: string;
}
