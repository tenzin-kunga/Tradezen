import { IsString, IsOptional, IsUUID, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateFolderDto {
  @ApiProperty({ example: "Companies" })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @ApiPropertyOptional({ example: "📁" })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  icon?: string;
}
