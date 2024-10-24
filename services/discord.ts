import logger from "@/utils/logger";

export async function sendDiscordNotification(streamerName: string) {
  try {
    logger.info(`Notification sent for ${streamerName}`);
  } catch (error) {
    logger.error(`Error sending Discord notification: ${error}`);
  }
}
