import { handleTwitchSubscription } from "@/handlers/twitch";
import { searchTwitchUsers } from "@/services/twitch";
import logger from "@/utils/logger";
import { type TwitchUser } from "@/handlers/twitch";
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
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
        .setAutocomplete(true)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The discord channel where notifications will be sent")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .addRoleOption((option) =>
      option
        .setName("mention")
        .setDescription("The role to mention when triggers")
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      await interaction.deferReply();
      const platform = interaction.options.getString("platform");
      const name = interaction.options.getString("name");
      const guildId = interaction.guildId;
      const channel = interaction.options.getChannel("channel");

      if (!platform || !name) {
        await interaction.editReply("Please provide both platform and name");
        return;
      }

      if (!guildId) {
        await interaction.editReply("This command can only be used in guilds");
        return;
      }

      if (!channel) {
        await interaction.editReply("Please provide a channel");
        return;
      }

      switch (platform) {
        case "twitch":
          const response = await handleTwitchSubscription(
            guildId,
            channel.id,
            name
          );
          if ((response.error && response.message) || !response.data) {
            await interaction.editReply(response.message);
          } else {
            const embed = new EmbedBuilder()
              .setColor(0x0099ff)
              .setTitle(`Subscribed to ${response.data?.display_name}`)
              .setThumbnail(response.data.profile_image_url)
              .setURL(`https://www.twitch.tv/${response.data?.login}`)
              .setFooter({ text: "Platform: Twitch" })
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
  async autocomplete(interaction: any): Promise<void> {
    if (!interaction.isAutocomplete()) return;
    const focusedOption = interaction.options.getFocused();
    const query = focusedOption.replace(/\s/g, "").toLowerCase();
    try {
      // TODO: handle platform based
      if (!query) {
        await interaction.respond([]);
        return;
      }
      const response = await searchTwitchUsers(query);
      if (response.error) {
        await interaction.respond([
          { name: "Error fetching streamers", value: "error" },
        ]);
      } else {
        if (!response.data) {
          await interaction.respond([]);
          return;
        }

        await interaction.respond(
          (response.data as TwitchUser[]).map((user) => ({
            name: `${user.display_name}: ${user.description}`,
            value: user.login,
          }))
        );
      }
    } catch (error) {
      await interaction.respond([
        { name: "Error fetching streamers", value: "error" },
      ]);
      logger.error(`Failed to fetch streamers: ${error}`);
    }
  },
};
