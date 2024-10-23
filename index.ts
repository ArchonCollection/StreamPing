import {
  ActivityType,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
} from "discord.js";
import config from "@/utils/config";
import logger from "@/utils/logger";
import fs from "fs";
import path from "path";

// Create the Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// On ready event
client.once(Events.ClientReady, async () => {
  try {
    logger.info(`Bot Started! Logged in as ${client.user?.tag}!`);

    // Set the bot's presence
    client.user?.setPresence({
      activities: [{ name: "for new pings", type: ActivityType.Watching }],
      status: "online",
    });

    // Register commands
    await registerCommands();
  } catch (error) {
    logger.error("Failed to register commands");
  }
});

// Collection to store commands
const commands = new Collection<string, any>();

// Dynamically load commands
const commandFiles = fs
  .readdirSync(path.join(__dirname, "commands"))
  .filter((file) => file.endsWith(".ts"));

for (const file of commandFiles) {
  const command = require(path.join(__dirname, "commands", file));
  commands.set(command.data.name, command);
}

// Dynamically load event handlers
const eventFiles = fs
  .readdirSync(path.join(__dirname, "events"))
  .filter((file) => file.endsWith(".ts"));

for (const file of eventFiles) {
  const event = require(path.join(__dirname, "events", file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Register commands with Discord API
async function registerCommands() {
  const commandJSON = commands.map((command: any) => command.data.toJSON());
  const rest = new REST({ version: "10" }).setToken(config.botToken || "");

  try {
    // Register the commands globally or for a specific guild
    await rest.put(Routes.applicationCommands(config.clientId || ""), {
      body: commandJSON,
    });
    logger.info("Commands registered successfully");
  } catch (error) {
    logger.error("Error registering commands with Discord API");
  }
}

// Handle interactions
client.on(Events.InteractionCreate, async (interaction: any) => {
  if (!interaction.isCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`Error executing command: ${interaction.commandName}`, error);
    await interaction.reply({
      content: "There was an error executing that command.",
      ephemeral: true,
    });
  }
});

client.login(config.botToken).catch(() => {
  logger.error("Failed to login to Discord");
});
