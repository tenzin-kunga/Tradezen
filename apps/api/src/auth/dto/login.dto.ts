import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "trader@example.com", description: "Email or username" })
  @IsString()
  identifier: string;

  @ApiProperty({ example: "SecurePass123!" })
  @IsString()
  password: string;
}
