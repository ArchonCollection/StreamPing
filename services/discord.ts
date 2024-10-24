import logger from "@/utils/logger";
import { client } from "..";
import { db } from "@/utils/db";
import type { TextChannel } from "discord.js";
import { unsubscribeFromTwitchEventSub } from "./twitch";

interface Event {
  id: string;
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  started_at: string;
}

export async function sendDiscordNotification(event: Event) {
  try {
    const subscriptions = await db.subscription.findMany({
      where: {
        channelId: event.broadcaster_user_id,
      },
    });

    if (subscriptions.length === 0) {
      await unsubscribeFromTwitchEventSub(event.broadcaster_user_id);
      return;
    }

    const messageContent = `**${event.broadcaster_user_name}** is live now! Watch at <https://www.twitch.tv/${event.broadcaster_user_login}>`;

    // TODO: Delete Subscriptions if Discord Channel not found

    const messageDelay = 500;
    const promises = subscriptions.map(async (subscription) => {
      try {
        const channel = (await client.channels.fetch(
          subscription.discordChannelId
        )) as TextChannel;

        if (!channel || !channel.isTextBased()) {
          logger.error(
            `Channel not found or is not a text channel: ${subscription.discordChannelId}`
          );
          return;
        }

        await sendMessageWithDelay(
          channel,
          messageContent,
          messageDelay,
          subscription.discordRoleId ? subscription.discordRoleId : undefined
        );
      } catch (error) {
        logger.error(
          `Error sending message to channel ${subscription.discordChannelId}: ${error}`
        );
      }
    });

    await Promise.all(promises);
  } catch (error) {
    logger.error(`Error sending Discord notification: ${error}`);
  }
}

async function sendMessageWithDelay(
  channel: TextChannel,
  message: string,
  delay: number,
  roleId?: string
) {
  await new Promise((resolve) => setTimeout(resolve, delay));

  if (roleId) {
    await channel.send(`<@&${roleId}> ${message}`);
  } else {
    await channel.send(message);
  }
}
