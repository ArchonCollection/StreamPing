import express, { type Request, type Response } from "express";
// import { sendDiscordNotification } from "@/services/discord";
import * as crypto from "crypto";
import config from "@/utils/config";

const router = express.Router();

// Twitch EventSub callback
// @ts-ignore
router.post("/twitch", async (req: Request, res: Response) => {
  const secret = config.twitchWebhookSecret;
  const signature = req.headers["twitch-eventsub-message-signature"] as string; // Cast to string
  const body = JSON.stringify(req.body);

  // Verify the message from Twitch (ensure security)
  if (!verifyTwitchMessage(secret, signature, body)) {
    return res.status(403).send("Forbidden");
  }

  // const event = req.body.event;

  if (req.body.subscription.type === "stream.online") {
    // TODO
  }

  res.status(200).send("Received");
});

function verifyTwitchMessage(
  secret: string,
  signature: string,
  body: string
): boolean {
  const hash = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex")}`;
  return signature === hash;
}

export default router;
