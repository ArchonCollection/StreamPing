import fetch from "node-fetch";
import config from "@/utils/config";
import logger from "@/utils/logger";
import fs from "fs";
import path from "path";
import { db } from "@/utils/db";

let twitchAccessToken: string | null = null;
let tokenExpiry: number | null = null;

const tokenFilePath = path.join(__dirname, "twitch_token.json");
function loadTokenFromFile() {
  if (fs.existsSync(tokenFilePath)) {
    const data = fs.readFileSync(tokenFilePath, "utf-8");
    const { accessToken, expiry } = JSON.parse(data);
    twitchAccessToken = accessToken;
    tokenExpiry = expiry;
    logger.info("Loaded Twitch Tokens from config.");
  }
}

loadTokenFromFile();

function saveTokenToFile(accessToken: string, expiry: number) {
  const data = JSON.stringify({ accessToken, expiry });
  fs.writeFileSync(tokenFilePath, data, "utf-8");
  logger.info("Twitch token saved to file.");
}

function isTokenValid() {
  return twitchAccessToken && tokenExpiry && Date.now() < tokenExpiry;
}

export async function getTwitchAccessToken(): Promise<string> {
  if (!twitchAccessToken || !tokenExpiry) {
    loadTokenFromFile();
  }

  if (isTokenValid()) {
    return twitchAccessToken!;
  }

  const response = await fetch(`https://id.twitch.tv/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.twitchClientId,
      client_secret: config.twitchClientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    logger.error(`Failed to get Twitch token: ${response.statusText}`);
    throw new Error("Failed to get Twitch access token.");
  }

  const responseData = await response.json();
  const data = responseData as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  twitchAccessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;

  saveTokenToFile(twitchAccessToken, tokenExpiry);
  try {
    await resubscribeToAllTwitchEvents();
  } catch (error) {
    logger.error(`Failed to resubscribe to existing Twitch events: ${error}`);
  }

  logger.info("Twitch Access Token Refreshed");
  return twitchAccessToken;
}

async function resubscribeToAllTwitchEvents() {
  try {
    const twitchSubscriptions = await db.subscription.findMany({
      where: { platform: "TWITCH" },
    });

    const uniqueChannelIds = new Set(
      twitchSubscriptions.map((subscription) => subscription.channelId)
    );

    const subscriptionPromises = Array.from(uniqueChannelIds).map(
      async (channelId) => {
        const callbackUrl = `${config.ngrokUrl}/callback/twitch`;

        const result = await subscribeToTwitchEventSub(channelId, callbackUrl);

        if (result.error) {
          logger.warn(
            `Failed to resubscribe to channel ${channelId}: ${result.message}`
          );
        }
      }
    );

    await Promise.all(subscriptionPromises);
    logger.info("Twitch subscriptions processed.");
  } catch (error) {
    logger.error(`Error resubscribing to Twitch events: ${error}`);
  }
}

export async function getChannelInfoByName(channelName: string) {
  try {
    const token = await getTwitchAccessToken();
    const response = await fetch(
      `https://api.twitch.tv/helix/users?login=${channelName}`,
      {
        method: "GET",
        headers: {
          "Client-ID": config.twitchClientId,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      return {
        error: true,
        message: "Failed to fetch Twitch channel info",
        user: null,
      };
    }

    const users: any = await response.json();
    if (users.data.length === 0) {
      return {
        error: false,
        user: null,
      };
    }

    return {
      error: false,
      user: users.data[0],
    };
  } catch (error) {
    logger.error(`Failed to fetch Twitch channel info: ${error}`);
    return {
      error: true,
      message: "Failed to fetch Twitch channel info",
      user: null,
    };
  }
}

export async function subscribeToTwitchEventSub(
  broadcasterId: string,
  callbackUrl: string
) {
  const token = await getTwitchAccessToken();

  const response = await fetch(
    `https://api.twitch.tv/helix/eventsub/subscriptions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Client-ID": config.twitchClientId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "stream.online",
        version: "1",
        condition: {
          broadcaster_user_id: broadcasterId,
        },
        transport: {
          method: "webhook",
          callback: callbackUrl,
          secret: config.twitchWebhookSecret,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    return { error: true, message: (error as any).message };
  }

  const data = await response.json();
  return { error: false, data };
}

// TODO: export async function unsubscribeFromTwitchEventSub

export async function searchTwitchUsers(query: string) {
  const token = await getTwitchAccessToken();
  const response = await fetch(
    `https://api.twitch.tv/helix/users?login=${query}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Client-ID": config.twitchClientId,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    logger.error(`Twitch search failed: ${error}`);
    return { error: true, message: (error as any).message };
  }

  const data = await response.json();
  return { error: false, data: (data as any).data };
}
