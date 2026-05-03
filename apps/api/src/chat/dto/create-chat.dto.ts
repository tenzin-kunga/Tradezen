import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from "class-validator";
import { ChatMessageDto } from "./chat-message.dto";

export class CreateChatDto {
  @ApiProperty({ type: [ChatMessageDto] })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @ApiPropertyOptional({ example: "openai/gpt-4o-mini" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @ApiPropertyOptional({ example: "You are a concise trading assistant." })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  systemPrompt?: string;

  @ApiPropertyOptional({ example: 0.4 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  temperature?: number;
}
