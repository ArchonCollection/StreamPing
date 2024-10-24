import {
  getChannelInfoByName,
  subscribeToTwitchEventSub,
} from "@/services/twitch";
import config from "@/utils/config";
import { db } from "@/utils/db";

export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  view_count: number;
  created_at: string;
}

export async function handleTwitchSubscription(
  guildId: string,
  channelId: string,
  channelName: string
) {
  let discordServer = await db.discordServer.upsert({
    where: { id: guildId },
    update: {},
    create: { id: guildId },
    include: { subscriptions: true },
  });

  if (discordServer.subscriptions.length >= 5) {
    return {
      error: true,
      message:
        "You have reached the maximum of 5 subscriptions for this server.",
    };
  }

  const twitchResponse: {
    error: boolean;
    user: TwitchUser | null;
    message?: string;
  } = await getChannelInfoByName(channelName);

  if (twitchResponse.error && twitchResponse.message) {
    return {
      error: true,
      message: twitchResponse.message,
    };
  }

  if (!twitchResponse.user) {
    return {
      error: true,
      message: `Twitch channel "${channelName}" not found.`,
    };
  }

  const existingSubscription = discordServer.subscriptions.find(
    (sub) =>
      sub.channelId === twitchResponse.user?.id && sub.platform === "TWITCH"
  );

  if (existingSubscription) {
    return {
      error: true,
      message: `This server is already subscribed to ${channelName}.`,
    };
  }

  const eventSubResponse = await subscribeToTwitchEventSub(
    twitchResponse.user.id,
    `${config.ngrokUrl}/callback/twitch`
  );

  if (eventSubResponse.error) {
    if (eventSubResponse.error) {
      if (!eventSubResponse.message?.includes("subscription already exists")) {
        return {
          error: true,
          message: `Failed to subscribe to Twitch events: ${eventSubResponse.message}.`,
        };
      }
    }
  }

  await db.subscription.create({
    data: {
      serverId: discordServer.id,
      discordChannelId: channelId,
      platform: "TWITCH",
      channelId: twitchResponse.user.id,
      channelName: twitchResponse.user.display_name,
    },
  });

  return {
    error: false,
    data: twitchResponse.user,
  };
}
