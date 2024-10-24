import logger from "@/utils/logger";

interface Event {
  id: string;
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  started_at: string;
}

export async function sendDiscordNotification(event: Event) {
  try {
    logger.info(event);
  } catch (error) {
    logger.error(`Error sending Discord notification: ${error}`);
  }
}
