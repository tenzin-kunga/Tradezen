import { IsString, IsOptional, IsBoolean } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "trader@example.com", description: "Email or username" })
  @IsString()
  identifier: string;

  @ApiProperty({ example: "SecurePass123!" })
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: "Keep me logged in across browser restarts" })
  @IsOptional()
  @IsBoolean()
  remember_me?: boolean;
}
