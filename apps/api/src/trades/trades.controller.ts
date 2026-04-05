import { Controller, Post, Get, Body } from "@nestjs/common";
import { TradesService } from "./trades.service";

@Controller("trades")
export class TradesController {
  constructor(private readonly service: TradesService) {}

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Get()
  getAll() {
    return this.service.findAll();
  }
}
