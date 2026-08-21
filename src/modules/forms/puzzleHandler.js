const { PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../../database/db');
const { createEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

function getFormsConfig(guildId) {
  try {
    const cfg = db.getGuildConfig(guildId);
    return (cfg.forms && cfg.forms.puzzlesubmit) || null;
  } catch (e) {
    return null;
  }
}

module.exports = {
  async handleInteraction(interaction) {
    // Only staff can approve/reject
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: "You do not have permission to review puzzle submissions.", flags: 64 });
    }

    const [prefix, verb, submissionId] = interaction.customId.split('_');
    if (prefix !== 'puzzle') return;
    const submission = db.getPuzzleSubmission(submissionId);

    if (!submission) {
      return interaction.reply({ content: "This submission can no longer be found (already processed).", flags: 64 });
    }

    const cfg = getFormsConfig(interaction.guildId);
    const mode = verb === 'approve' ? 'approve' : 'reject';

    if (mode === 'approve') {
      const publicChannel = cfg && cfg.publicChannel
        ? interaction.guild.channels.cache.get(String(cfg.publicChannel))
        : null;

      if (!publicChannel) {
        return interaction.reply({
          content: "The public puzzle channel isn't configured or no longer exists. Set `forms.puzzlesubmit.publicChannel` in `config.json` (as a quoted string), or the bot lacks permission to see it.",
          flags: 64
        });
      }

      const isForum = publicChannel.type === ChannelType.GuildForum;
      if (!isForum && !publicChannel.isTextBased()) {
        return interaction.reply({
          content: `The public puzzle channel <#${String(cfg.publicChannel)}> is not a text channel, so puzzles can't be posted there. Use a normal text channel or a forum (forum = one post per puzzle).`,
          flags: 64
        });
      }

      const fields = [
        { name: "Difficulty", value: submission.difficulty.charAt(0).toUpperCase() + submission.difficulty.slice(1), inline: true },
        { name: "Author", value: `<@${submission.author_id}>`, inline: true },
        { name: "Posted by", value: `${interaction.user}`, inline: true }
      ];
      if (submission.details) fields.push({ name: "Details", value: submission.details.slice(0, 1024), inline: false });
      if (submission.hint) fields.push({ name: "Hint", value: submission.hint.slice(0, 1024), inline: false });

      const publicEmbed = createEmbed({
        title: `🧩 ${submission.title}`,
        description: submission.question,
        fields: fields,
        color: '#9b59b6'
      });
      if (submission.image_url) publicEmbed.setImage(submission.image_url);

      const postRolePing = cfg && cfg.postRole ? `<@&${String(cfg.postRole)}>` : null;

      const answerFiles = submission.answer_image_url
        ? [{ attachment: submission.answer_image_url, name: `SPOILER_answer.png` }]
        : undefined;

      try {
        let postMsg;
        if (isForum) {
          // Forum channel: create a forum post (thread) per puzzle
          postMsg = await publicChannel.threads.create({
            name: `🧩 ${submission.title}`.slice(0, 100),
            message: {
              content: postRolePing || undefined,
              embeds: [publicEmbed],
              allowedMentions: postRolePing ? { parse: ['roles'] } : undefined
            }
          });
          await postMsg.send({
            content: `> **Answer:** ||${submission.answer}||`,
            files: answerFiles
          });
        } else {
          // Normal text channel: post the message, answer as a reply
          postMsg = await publicChannel.send({
            content: postRolePing || undefined,
            embeds: [publicEmbed],
            allowedMentions: postRolePing ? { parse: ['roles'] } : undefined
          });
          await postMsg.reply({
            content: `> **Answer:** ||${submission.answer}||`,
            files: answerFiles
          });
        }
      } catch (err) {
        logger.error(`Puzzle posting failed: ${err.message}`);
        return interaction.reply({ content: `Failed to post the puzzle to ${publicChannel}: ${err.message}`, flags: 64 });
      }

      db.deletePuzzleSubmission(submissionId);
      await interaction.update({
        content: null,
        embeds: [createEmbed({
          title: "Puzzle Approved & Posted",
          description: `**${submission.title}** was approved and posted to ${publicChannel}.`,
          color: '#2ed573'
        })],
        components: []
      });
      return interaction.followUp({ content: "Posted successfully.", flags: 64 });
    }

    // Reject
    db.deletePuzzleSubmission(submissionId);
    await interaction.update({
      content: null,
      embeds: [createEmbed({
        title: "Puzzle Rejected",
        description: `**${submission.title}** was rejected by ${interaction.user}. The author was **not** notified.`,
        color: '#ff4757'
      })],
      components: []
    });
    return interaction.followUp({ content: "Submission rejected.", flags: 64 });
  }
};