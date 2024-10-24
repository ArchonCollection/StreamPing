import fetch from "node-fetch";
import config from "@/utils/config";
import logger from "@/utils/logger";

let twitchAccessToken: string | null = null;
let tokenExpiry: number | null = null;

async function getTwitchAccessToken(): Promise<string> {
  if (twitchAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return twitchAccessToken;
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
    logger.info(`Failed to get Twitch token: ${response.statusText}`);
  }

  const responseData = await response.json();
  const data = responseData as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  twitchAccessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;

  logger.info("Twitch Access Token Refreshed");
  return twitchAccessToken;
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
