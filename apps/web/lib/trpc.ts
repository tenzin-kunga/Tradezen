import { createTRPCReact } from "@trpc/react-query";
import type { appRouter } from "api/trpc";

export const trpc = createTRPCReact<typeof appRouter>();
