import { IsUUID, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateLinkDto {
  @ApiProperty()
  @IsUUID()
  target_document_id: string;

  @ApiProperty({ enum: ["references", "cites", "related", "contradicts", "supports"] })
  @IsEnum(["references", "cites", "related", "contradicts", "supports"])
  relationship_type: string;
}
