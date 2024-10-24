import {
  getServerSubscriptions,
  unsubscribeChannel,
} from "@/handlers/subscriptions";
import logger from "@/utils/logger";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("unsubscribe")
    .setDescription("Unsubscribe from a channel")
    .addStringOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel you want to unsubscribe from")
        .setRequired(true)
        .setAutocomplete(true)
    ),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      await interaction.deferReply();
      const channelId = interaction.options.getString("channel");
      if (!channelId) {
        await interaction.editReply(
          "You must provide a channel ID to unsubscribe from"
        );
        return;
      }

      if (!interaction.guild) {
        await interaction.editReply("This command can only be used in guilds");
        return;
      }

      const channel = await unsubscribeChannel(interaction.guild.id, channelId);

      await interaction.editReply(
        `You have successfully unsubscribed from channel ${channel.channelName}`
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "PrismaClientKnownRequestError"
      ) {
        await interaction.editReply(
          "The channel you are trying to unsubscribe from does not exist in the database"
        );
        return;
      }
      await interaction.editReply("An error occurred: ```" + error + "```");
      logger.error(`Failed to unsubscribe from channel ${error}`);
    }
  },

  async autocomplete(interaction: any): Promise<void> {
    if (!interaction.isAutocomplete()) return;

    const discordServerId = interaction.guildId;
    const focusedOption = interaction.options.getFocused();

    try {
      const subscriptions = await getServerSubscriptions(discordServerId);
      const filtered = subscriptions
        .filter((subscription) =>
          subscription.channelName
            .toLowerCase()
            .includes(focusedOption.toLowerCase())
        )
        .map((subscription) => ({
          name:
            subscription.channelName +
            " (" +
            subscription.platform[0] +
            subscription.platform.slice(1).toLowerCase() +
            ")",
          value: subscription.channelId,
        }));

      await interaction.respond(filtered);
    } catch (error) {
      await interaction.respond([
        { name: "Error fetching subscriptions", value: "error" },
      ]);
      logger.error(
        `Failed to fetch subscriptions for server ${discordServerId}: ${error}`
      );
    }
  },
};
