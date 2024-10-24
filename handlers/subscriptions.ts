import { db } from "@/utils/db";

export async function getServerSubscriptions(serverId: string) {
  return await db.subscription.findMany({
    where: { serverId },
  });
}

export async function unsubscribeChannel(serverId: string, channelId: string) {
  return await db.subscription.delete({
    where: { serverId_channelId: { serverId, channelId } },
  });
}
