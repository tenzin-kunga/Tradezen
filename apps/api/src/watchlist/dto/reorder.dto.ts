import { IsString, IsNumber, IsEnum, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ReorderWatchlistDto {
  @ApiProperty({ example: "move" })
  @IsEnum(["move"])
  type: "move";

  @ApiProperty()
  @IsString()
  itemId: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  from: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(0)
  to: number;
}
