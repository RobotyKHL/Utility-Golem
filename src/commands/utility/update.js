const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { exec } = require('child_process');
const { createEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
  module: 'utility',
  data: new SlashCommandBuilder()
    .setName('update')
    .setDescription('Download the latest code from GitHub and restart the bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    // Only allow server administrators/owners to run this
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "You do not have permission to run this command.", flags: 64 });
    }

    await interaction.deferReply({ flags: 64 });

    const repoZip = 'https://github.com/wayback09/Utility-Golem-/archive/refs/heads/main.tar.gz';
    const container = '/home/container';
    const tmpTar = '/tmp/golem_update.tar.gz';
    const tmpDir = '/tmp/Utility-Golem--main';

    logger.info('Auto-update triggered via /update command.');

    // Execute the update commands sequentially
    exec(`curl -fsSL --retry 5 --retry-delay 5 --retry-all-errors "${repoZip}" -o "${tmpTar}" && tar -xzf "${tmpTar}" -C /tmp/`, async (error, stdout, stderr) => {
      if (error) {
        logger.error(`Update download failed: ${error.message}`);
        return interaction.editReply({
          embeds: [createEmbed({
            title: "❌ Update Failed",
            description: `Failed to download or extract the update files:\n\`\`\`${error.message}\`\`\``,
            color: '#ff4757'
          })]
        });
      }

      // Overwrite the src folder
      const srcSource = path.join(tmpDir, 'src');
      const srcDest = path.join(container, 'src');

      if (!fs.existsSync(srcSource)) {
        logger.error('Extracted src folder not found.');
        return interaction.editReply({
          embeds: [createEmbed({
            title: "❌ Update Failed",
            description: "Could not locate the downloaded source files in the temp directory.",
            color: '#ff4757'
          })]
        });
      }

      try {
        // Copy the new src directory over (cp -r will overwrite existing files)
        exec(`cp -r "${srcSource}/." "${srcDest}/" && rm -rf "${tmpTar}" "${tmpDir}"`, async (copyError) => {
          if (copyError) {
            logger.error(`Failed to copy files: ${copyError.message}`);
            return interaction.editReply({
              embeds: [createEmbed({
                title: "❌ Update Failed",
                description: `Failed to copy the updated files to the container:\n\`\`\`${copyError.message}\`\`\``,
                color: '#ff4757'
              })]
            });
          }

          logger.success('Auto-update files copied successfully. Restarting bot...');

          await interaction.editReply({
            embeds: [createEmbed({
              title: "✅ Update Installed",
              description: "The latest code has been downloaded and installed! The bot is now restarting to apply the updates.",
              color: '#2ed573'
            })]
          });

          // Give Pterodactyl a second to save everything, then exit the process
          // The parent bootstrap launcher will automatically catch the exit and reboot the bot
          setTimeout(() => {
            process.exit(0);
          }, 2000);
        });

      } catch (err) {
        logger.error(`Update copy script crashed: ${err.message}`);
        return interaction.editReply({
          content: `An unexpected error occurred during copy operation: ${err.message}`
        });
      }
    });
  }
};
