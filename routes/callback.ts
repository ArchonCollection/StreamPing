import { Router } from "express";
// import { db } from "@/utils/db";

const router = Router();

router.post("/twitch", async (_, res) => {
  try {
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(500);
  }
});

export default router;
