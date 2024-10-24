import dotenv from "dotenv";
import logger from "./logger";

dotenv.config();

if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_BOT_TOKEN) {
  logger.error(
    "Missing DISCORD_CLIENT_ID and/or DISCORD_BOT_TOKEN environment variable"
  );
  process.exit(1);
}

if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
  logger.warn(
    "Missing TWITCH_CLIENT_ID and/or TWITCH_CLIENT_SECRET environment variable. Twitch service will not be available."
  );
}

const config = {
  clientId: process.env.DISCORD_CLIENT_ID,
  botToken: process.env.DISCORD_BOT_TOKEN,
  twitchClientId: process.env.TWITCH_CLIENT_ID || "",
  twitchClientSecret: process.env.TWITCH_CLIENT_SECRET || "",
};

export default config;
