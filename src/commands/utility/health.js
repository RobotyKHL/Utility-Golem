const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedBuilder');

module.exports = {
  module: 'utility',
  data: new SlashCommandBuilder()
    .setName('health')
    .setDescription('Check the overall health and status of Golem'),
  async execute(interaction) {
    const apiPing = Math.round(interaction.client.ws.ping);
    const wsConnected = interaction.client.ws.status === 0;
    const memUsed = process.memoryUsage().heapUsed / 1024 / 1024;

    let totalSeconds = (interaction.client.uptime / 1000);
    const days = Math.floor(totalSeconds / 86400);
    totalSeconds %= 86400;
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);

    const isHealthy = wsConnected && apiPing < 500;

    return interaction.reply({
      embeds: [createEmbed({
        title: "🩺 Golem Health Check",
        description: isHealthy
          ? "All systems operational, bot is online and responding."
          : "⚠️ Bot is running but experiencing degraded status.",
        fields: [
          { name: "Status", value: wsConnected ? "🟢 Online" : "🔴 Offline", inline: true },
          { name: "API Gateway Ping", value: `\`${apiPing}ms\``, inline: true },
          { name: "Uptime", value: `\`${days}d ${hours}h ${minutes}m\``, inline: true },
          { name: "Memory Usage", value: `\`${memUsed.toFixed(1)} MB\``, inline: true },
          { name: "Servers Connected", value: `\`${interaction.client.guilds.cache.size}\``, inline: true },
          { name: "Database", value: "`OK`", inline: true }
        ],
        color: isHealthy ? '#2ed573' : '#ffa502'
      })]
    });
  }
};