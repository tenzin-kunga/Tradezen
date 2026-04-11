import { IsString, IsIn, IsNumber, IsOptional, IsBoolean, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class CreateTradeDto {
  @ApiProperty({ example: "EURUSD" })
  @IsString()
  symbol: string;

  @ApiProperty({ enum: ["buy", "sell"] })
  @IsIn(["buy", "sell"])
  direction: "buy" | "sell";

  @ApiProperty({ example: 1.085 })
  @Type(() => Number)
  @IsNumber()
  entry: number;

  @ApiProperty({ example: 1.092 })
  @Type(() => Number)
  @IsNumber()
  exit: number;

  @ApiProperty({ example: 1.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  lot: number;

  @ApiPropertyOptional({ example: 1.08 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stop_loss?: number | null;

  @ApiPropertyOptional({ example: 1.1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  take_profit?: number | null;

  @ApiPropertyOptional({ example: "breakout" })
  @IsOptional()
  @IsString()
  strategy?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  fomo_check?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  trend_alignment?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  vengeance_trade?: boolean;
}
