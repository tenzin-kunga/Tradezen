import { IsString, IsOptional, IsEnum, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateWatchlistDto {
  @ApiProperty({ example: "My Watchlist" })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: "manual", enum: ["manual", "smart"] })
  @IsOptional()
  @IsEnum(["manual", "smart"])
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  definition?: Record<string, unknown>;
}
