import dotenv from "dotenv";
import logger from "./logger";

dotenv.config();

if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_BOT_TOKEN) {
  logger.error(
    "Missing DISCORD_CLIENT_ID and/or DISCORD_BOT_TOKEN environment variable"
  );
  process.exit(1);
}

const config = {
  clientId: process.env.DISCORD_CLIENT_ID,
  botToken: process.env.DISCORD_BOT_TOKEN,
};

export default config;
