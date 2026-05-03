import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { CurrentUser } from "../auth/current-user.decorator";
import { ChatService } from "./chat.service";
import { CreateChatDto } from "./dto/create-chat.dto";

@ApiTags("chat")
@ApiBearerAuth()
@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get("models")
  @ApiOperation({ summary: "Get configured OpenRouter models" })
  models() {
    return this.chatService.getModels();
  }

  @Post("stream")
  @ApiOperation({ summary: "Stream chat completions via OpenRouter" })
  async stream(
    @CurrentUser("id") userId: string,
    @Body() dto: CreateChatDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const abortController = new AbortController();
    const onClientClose = () => abortController.abort();
    req.on("close", onClientClose);

    const writeEvent = (event: string, data: string) => {
      if (res.writableEnded) return;
      res.write(`event: ${event}\n`);
      res.write(`data: ${data}\n\n`);
    };

    try {
      await this.chatService.streamChat(userId, dto, abortController.signal, {
        onToken: (token) => writeEvent("token", token),
        onDone: () => writeEvent("done", "[DONE]"),
      });
      if (!res.writableEnded) res.end();
    } catch (error) {
      if (abortController.signal.aborted) {
        if (!res.writableEnded) res.end();
        return;
      }
      const message = error instanceof Error ? error.message : "Chat request failed";
      writeEvent("error", message);
      if (!res.writableEnded) res.end();
    } finally {
      req.off("close", onClientClose);
    }
  }
}
