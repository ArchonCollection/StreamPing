import dotenv from "dotenv";
import logger from "@/utils/logger";
import ngrok from "ngrok";

dotenv.config();

const NGROK_AUTH_TOKEN = process.env.NGROK_AUTH_TOKEN;

export async function getReservedDomains() {
  const url = "https://api.ngrok.com/reserved_domains";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${NGROK_AUTH_TOKEN}`,
        "Content-Type": "application/json",
        "Ngrok-Version": "2",
      },
    });

    if (!response.ok) {
      logger.error(`Error fetching reserved domains: ${response.statusText}`);
      return;
    }

    const data = await response.json();
    return data.reserved_domains;
  } catch (error) {
    logger.error(`Error fetching reserved domains: ${error}`);
  }
}

export async function createStaticNgrokTunnel(domain: string) {
  try {
    const tunnel = await ngrok.connect({
      addr: 3005,
      proto: "http",
      hostname: domain,
    });
    logger.info(`Started Ngrok Tunnel: ${domain}`);
    return tunnel;
  } catch (error) {
    logger.error(`Error creating ngrok tunnel: ${error}`);
    process.exit(1);
  }
}
