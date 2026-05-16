import {
  IsString,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'trader@example.com',
    description: 'Email or username',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  identifier: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({
    description: 'Keep me logged in across browser restarts',
  })
  @IsOptional()
  @IsBoolean()
  remember_me?: boolean;
}
