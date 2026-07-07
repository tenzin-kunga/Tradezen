import { IsString, IsOptional, IsUUID, IsEnum, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateDocumentDto {
  @ApiProperty({ example: "BEL Research" })
  @IsString()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  folder_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ enum: ["thesis", "analysis", "playbook", "macro", "note", "snapshot", "postmortem"] })
  @IsOptional()
  @IsEnum(["thesis", "analysis", "playbook", "macro", "note", "snapshot", "postmortem"])
  doc_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  template_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  frontmatter?: Record<string, unknown>;
}
