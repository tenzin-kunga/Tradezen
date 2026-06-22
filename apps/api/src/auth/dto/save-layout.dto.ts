import { IsArray, IsString, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class LayoutWidgetDto {
  @ApiProperty({ example: 'equity-curve' })
  @IsString()
  id: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  visible: boolean;

  @ApiProperty({ enum: ['S', 'M', 'L'] })
  @IsIn(['S', 'M', 'L'])
  size: 'S' | 'M' | 'L';
}

export class SaveLayoutDto {
  @ApiProperty({ type: [LayoutWidgetDto] })
  @IsArray()
  widgets: LayoutWidgetDto[];
}
