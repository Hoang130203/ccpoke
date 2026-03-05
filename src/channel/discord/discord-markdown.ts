import { EmbedBuilder } from "discord.js";

import { formatDuration, formatModelName, formatTokenCount } from "../../utils/stats-format.js";
import type { NotificationData } from "../types.js";

const DISCORD_EMBED_COLOR = 0x00b894;

export function formatNotificationEmbed(
  data: NotificationData,
  responseUrl?: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(DISCORD_EMBED_COLOR)
    .setTitle(`📦 ${data.projectName}`)
    .setTimestamp();

  const metaParts: string[] = [`🐾 ${data.agentDisplayName}`];
  if (data.durationMs > 0) {
    metaParts.push(`⏱ ${formatDuration(data.durationMs)}`);
  }
  embed.setDescription(metaParts.join(" · "));

  if (data.responseSummary) {
    const snippet =
      data.responseSummary.length > 500
        ? data.responseSummary.slice(0, 497) + "..."
        : data.responseSummary;
    embed.addFields({ name: "", value: snippet });
  }

  if (data.inputTokens > 0 || data.outputTokens > 0) {
    embed.addFields({
      name: "",
      value: `📊 In: ${formatTokenCount(data.inputTokens)} · Out: ${formatTokenCount(data.outputTokens)}`,
      inline: true,
    });
  }

  if (data.model) {
    embed.addFields({ name: "", value: `🤖 ${formatModelName(data.model)}`, inline: true });
  }

  if (responseUrl) {
    embed.setURL(responseUrl);
  }

  return embed;
}
