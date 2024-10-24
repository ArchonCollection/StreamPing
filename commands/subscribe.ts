import { handleTwitchSubscription } from "@/handlers/twitch";
import logger from "@/utils/logger";
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("subscribe")
    .setDescription("Subscribe to a channel")
    .addStringOption((option) =>
      option
        .setName("platform")
        .setDescription("The platform to subscribe to")
        .setRequired(true)
        .addChoices([
          {
            name: "Twitch",
            value: "twitch",
          },
          {
            name: "Youtube",
            value: "youtube",
          },
        ])
    )
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("The name of the channel")
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      await interaction.deferReply();
      const platform = interaction.options.getString("platform");
      const name = interaction.options.getString("name");
      const guildId = interaction.guildId;

      if (!platform || !name) {
        await interaction.editReply("Please provide both platform and name");
        return;
      }

      if (!guildId) {
        await interaction.editReply("This command can only be used in guilds");
        return;
      }

      switch (platform) {
        case "twitch":
          const response = await handleTwitchSubscription(guildId, name);
          if ((response.error && response.message) || !response.data) {
            await interaction.editReply(response.message);
          } else {
            const embed = new EmbedBuilder()
              .setColor(0x0099ff)
              .setTitle(`Subscribed to ${response.data?.display_name}`)
              .setThumbnail(response.data.profile_image_url)
              .setURL(`https://www.twitch.tv/${response.data?.login}`)
              .setFooter({ text: "Twitch" })
              .setDescription(response.data?.description || "No description");

            await interaction.editReply({ embeds: [embed] });
          }
          break;
        case "youtube":
          break;
        default:
          await interaction.editReply(
            "Invalid platform. Please use 'twitch' or 'youtube'"
          );
      }
    } catch (error) {
      await interaction.editReply("An error occurred: ```" + error + "```");
      logger.error(`Failed to subscribe to channel ${error}`);
    }
  },
};
