import { getChannelInfoByName } from "@/services/twitch";
import { db } from "@/utils/db";

interface TwitchUser {
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
  channelName: string
) {
  let discordServer = await db.discordServer.upsert({
    where: { discordServerId: guildId },
    update: {},
    create: { discordServerId: guildId },
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

  await db.subscription.create({
    data: {
      discordServerId: discordServer.id,
      platform: "TWITCH",
      channelId: twitchResponse.user.id,
    },
  });

  return {
    error: false,
    data: twitchResponse.user,
  };
}
