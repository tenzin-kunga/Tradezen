import { IsOptional, IsNumber, IsString, IsIn, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  initial_capital?: number;

  @ApiPropertyOptional({ example: 0.01 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  default_lot_size?: number;

  @ApiPropertyOptional({ example: "UTC" })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ enum: ["dark", "light"] })
  @IsOptional()
  @IsIn(["dark", "light"])
  theme?: string;
}
