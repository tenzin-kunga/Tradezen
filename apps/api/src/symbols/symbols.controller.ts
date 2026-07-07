import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SymbolsService } from "./symbols.service";
import { CreateSymbolDto } from "./dto";

@ApiTags("symbols")
@ApiBearerAuth()
@Controller("symbols")
export class SymbolsController {
  constructor(private readonly symbolsService: SymbolsService) {}

  @Get("search")
  @ApiOperation({ summary: "Search symbols by ticker or name" })
  async search(@Query("q") query: string) {
    return this.symbolsService.search(query || "");
  }

  @Post()
  @ApiOperation({ summary: "Create or find a symbol (lookup-or-create)" })
  async create(@Body() dto: CreateSymbolDto) {
    return this.symbolsService.lookupOrCreate(
      dto.ticker,
      dto.exchange,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get symbol by ID" })
  async getById(@Param("id") id: string) {
    return this.symbolsService.getById(id);
  }
}
