import { IsString, IsOptional, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTagDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ default: "#888888" })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ enum: ["setup", "condition", "emotion"], default: "setup" })
  @IsOptional()
  @IsEnum(["setup", "condition", "emotion"])
  category?: string;
}
