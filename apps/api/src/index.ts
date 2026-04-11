import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRoute } from "@/routes/auth";
import { repositoryRoute } from "@/routes/repositories";
import { summaryRoute } from "@/routes/summaries";
import { webhookRoute } from "@/routes/webhooks";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  }),
);

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.route("/api/auth", authRoute);
app.route("/api/repositories", repositoryRoute);
app.route("/api/summaries", summaryRoute);
app.route("/api/webhooks", webhookRoute);

export { app };

const port = Number(process.env.PORT) || 4000;

export default {
  port,
  fetch: app.fetch,
};
