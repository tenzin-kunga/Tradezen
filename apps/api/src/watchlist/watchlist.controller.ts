import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { WatchlistService } from "./watchlist.service";
import {
  CreateWatchlistDto,
  CreateWatchlistItemDto,
  UpdateWatchlistItemDto,
  ReorderWatchlistDto,
} from "./dto";

@ApiTags("watchlist")
@ApiBearerAuth()
@Controller("watchlists")
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  @ApiOperation({ summary: "List user's watchlists" })
  async list(@CurrentUser("id") userId: string) {
    return this.watchlistService.listWatchlists(userId);
  }

  @Post()
  @ApiOperation({ summary: "Create a watchlist" })
  async create(
    @CurrentUser("id") userId: string,
    @Body() dto: CreateWatchlistDto,
  ) {
    return this.watchlistService.createWatchlist(userId, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a watchlist" })
  async delete(
    @CurrentUser("id") userId: string,
    @Param("id") watchlistId: string,
  ) {
    return this.watchlistService.deleteWatchlist(userId, watchlistId);
  }

  @Get(":id/items")
  @ApiOperation({ summary: "List items in a watchlist" })
  async getItems(
    @CurrentUser("id") userId: string,
    @Param("id") watchlistId: string,
  ) {
    return this.watchlistService.getItems(watchlistId, userId);
  }

  @Post(":id/items")
  @ApiOperation({ summary: "Add an item to a watchlist" })
  async addItem(
    @CurrentUser("id") userId: string,
    @Param("id") watchlistId: string,
    @Body() dto: CreateWatchlistItemDto,
  ) {
    return this.watchlistService.addItem(userId, watchlistId, dto);
  }

  @Put(":id/items/:itemId")
  @ApiOperation({ summary: "Update a watchlist item" })
  async updateItem(
    @CurrentUser("id") userId: string,
    @Param("id") watchlistId: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateWatchlistItemDto,
  ) {
    return this.watchlistService.updateItem(userId, watchlistId, itemId, dto);
  }

  @Delete(":id/items/:itemId")
  @ApiOperation({ summary: "Remove an item from a watchlist" })
  async deleteItem(
    @CurrentUser("id") userId: string,
    @Param("id") watchlistId: string,
    @Param("itemId") itemId: string,
  ) {
    return this.watchlistService.deleteItem(userId, watchlistId, itemId);
  }

  @Post(":id/reorder")
  @ApiOperation({ summary: "Reorder items in a watchlist" })
  async reorder(
    @CurrentUser("id") userId: string,
    @Param("id") watchlistId: string,
    @Body() dto: ReorderWatchlistDto,
  ) {
    return this.watchlistService.reorder(userId, watchlistId, dto);
  }
}
