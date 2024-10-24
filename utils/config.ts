import dotenv from "dotenv";
import logger from "./logger";
import { getReservedDomains, createStaticNgrokTunnel } from "@/services/ngrok";

dotenv.config();

if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_BOT_TOKEN) {
  logger.error(
    "Missing DISCORD_CLIENT_ID and/or DISCORD_BOT_TOKEN environment variable"
  );
  process.exit(1);
}

let ngrokUrl: string | null = null;

if (
  !process.env.TWITCH_CLIENT_ID ||
  !process.env.TWITCH_CLIENT_SECRET ||
  !process.env.NGROK_AUTH_TOKEN
) {
  logger.warn(
    "Missing TWITCH_CLIENT_ID, NGROK_AUTH_TOKEN and/or TWITCH_CLIENT_SECRET environment variable. Twitch service will not be available."
  );
} else {
  const reservedDomains = await getReservedDomains();
  
  if (reservedDomains.length === 0) {
    logger.error("Please add at least one domain to your ngrok account");
    process.exit(1);
  }

  await createStaticNgrokTunnel(reservedDomains[0].domain);
  ngrokUrl = "https://" + reservedDomains[0].domain;
}

const config = {
  clientId: process.env.DISCORD_CLIENT_ID,
  botToken: process.env.DISCORD_BOT_TOKEN,
  twitchClientId: process.env.TWITCH_CLIENT_ID || "",
  twitchClientSecret: process.env.TWITCH_CLIENT_SECRET || "",
  twitchWebhookSecret: process.env.TWITCH_WEBHOOK_SECRET || "SECRET",
  ngrokUrl,
};

export default config;
