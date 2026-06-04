import { IsString, IsNumber, IsOptional, IsIn, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const GOAL_TYPES = [
  'monthly_pnl',
  'monthly_win_rate',
  'profit_factor',
  'total_trades',
  'max_drawdown',
  'avg_rr',
  'consecutive_wins',
] as const;

export const GOAL_PERIODS = ['monthly', 'weekly', 'yearly'] as const;

export const GOAL_DIRECTIONS = ['higher', 'lower'] as const;

export type GoalType = (typeof GOAL_TYPES)[number];
export type GoalPeriod = (typeof GOAL_PERIODS)[number];
export type GoalDirection = (typeof GOAL_DIRECTIONS)[number];

export class CreateGoalDto {
  @ApiProperty({ enum: GOAL_TYPES })
  @IsString()
  @IsIn(GOAL_TYPES)
  type: GoalType;

  @ApiProperty()
  @IsNumber()
  target: number;

  @ApiPropertyOptional({ default: 'monthly' })
  @IsOptional()
  @IsString()
  @IsIn(GOAL_PERIODS)
  period?: GoalPeriod;

  @ApiPropertyOptional({ default: 'higher' })
  @IsOptional()
  @IsString()
  @IsIn(GOAL_DIRECTIONS)
  direction?: GoalDirection;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
