import express, { type Request, type Response } from "express";
import { sendDiscordNotification } from "@/services/discord";
import escape from "escape-html";

const router = express.Router();

// @ts-ignore
router.post("/twitch", async (req: Request, res: Response) => {
  if (req.body.subscription && req.body.challenge) {
    const { challenge } = req.body;
    return res.status(200).send(escape(challenge));
  }

  if (
    req.header("Twitch-Eventsub-Message-Retry") &&
    parseInt(req.header("Twitch-Eventsub-Message-Retry") || "0") > 0
  ) {
    return res.status(200).send("OK");
  }

  if (req.body.subscription && req.body.subscription.type === "stream.online") {
    sendDiscordNotification(req.body.event);
  }

  res.status(200).send("OK");
});

export default router;
