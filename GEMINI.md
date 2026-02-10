<!-- INNGEST START -->
# Inngest Background Functions

**This project uses Inngest for background jobs. All functions are served via `/api/inngest`.**

## Cron Function

```ts
import { inngest } from "./client";

export const myScheduled = inngest.createFunction(
  {
    id: "my-scheduled-task",
    concurrency: [{ limit: 1 }],
    retries: 3,
  },
  { cron: "*/5 * * * *" }, // Every 5 minutes
  async () => {
    console.log("Running scheduled task");
    return { success: true };
  },
);
```

## Event-Driven Function

```ts
import { inngest } from "./client";

export const processData = inngest.createFunction(
  {
    id: "process-data",
    concurrency: [{ limit: 2 }],
    retries: 3,
  },
  { event: "data/process.requested" },
  async ({ event, attempt }) => {
    const { userId, data } = event.data;
    console.log(`Processing for user ${userId}, attempt ${attempt}`);
    return { processed: data.length };
  },
);
```

## Triggering Events

```ts
import { inngest } from "@/inngest/client";

// Send an event to trigger a function
await inngest.send({
  name: "data/process.requested",
  data: { userId: "123", data: [{ id: 1 }] },
});
```

## Serve Route (Next.js App Router)

```ts
// src/app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { myFunction } from "@/inngest/my-function";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [myFunction],
});
```

## Key Points

- Functions live in `src/inngest/` and are registered in `src/app/api/inngest/route.ts`
- Client defined in `src/inngest/client.ts`
- Cron: `{ cron: "expression" }` as the trigger
- Events: `{ event: "namespace/action" }` as the trigger
- Concurrency: `concurrency: [{ limit: N }]`
- Retries: `retries: N` in function config
- No separate CLI deploy — Inngest auto-discovers on Vercel deployment

<!-- INNGEST END -->
