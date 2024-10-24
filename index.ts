import express from "express";
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
import callbackRoutes from "@/routes/callback";

const app = express();
const PORT = 3000;

app.use(express.json());

app.use("/callback", callbackRoutes);

app.listen(PORT, () => {
  logger.info(`Callback server running on port ${PORT}`);
});

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

// Collect promises for loading commands
const commandPromises = commandFiles.map(async (file) => {
  try {
    const command = await import(`./commands/${file.replace(".ts", "")}`);
    if (command.default && command.default.data && command.default.data.name) {
      return [command.default.data.name, command.default];
    } else {
      logger.error(`Command ${file} is missing required properties.`);
      return null;
    }
  } catch (error) {
    logger.error(`Failed to load command ${file}: ${error}`);
    return null;
  }
});

const loadedCommands = await Promise.all(commandPromises);

loadedCommands.forEach((command) => {
  if (command) {
    commands.set(command[0], command[1]);
  } else {
    logger.error(`Failed to load a command due to previous errors.`);
  }
});

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
  const command = commands.get(interaction.commandName);
  if (interaction.isCommand()) {
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(
        `Error executing command: ${interaction.commandName}`,
        error
      );
      await interaction.reply({
        content: "There was an error executing that command.",
        ephemeral: true,
      });
    }
  } else if (interaction.isAutocomplete()) {
    const command = commands.get(interaction.commandName);
    if (command && command.autocomplete) {
      try {
        await command.autocomplete(interaction);
      } catch (error) {
        logger.error(
          `Error handling autocomplete for command: ${interaction.commandName}`,
          error
        );
      }
    }
  }
});

client.login(config.botToken).catch(() => {
  logger.error("Failed to login to Discord");
});
