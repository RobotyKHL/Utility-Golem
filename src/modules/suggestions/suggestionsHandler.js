const db = require('../../database/db');
const { createEmbed } = require('../../utils/embedBuilder');
const { PermissionFlagsBits } = require('discord.js');

async function handleInteraction(interaction) {
  const { customId, user, guild, message } = interaction;
  const suggestion = db.getSuggestion(message.id);
  if (!suggestion) return interaction.reply({ content: "Suggestion details not found in database.", ephemeral: true });

  let upvotes = JSON.parse(suggestion.votes_up || '[]');
  let downvotes = JSON.parse(suggestion.votes_down || '[]');

  if (customId === 'suggest_upvote') {
    if (upvotes.includes(user.id)) {
      upvotes = upvotes.filter(id => id !== user.id);
    } else {
      upvotes.push(user.id);
      downvotes = downvotes.filter(id => id !== user.id); // Remove downvote if upvoting
    }
  } else if (customId === 'suggest_downvote') {
    if (downvotes.includes(user.id)) {
      downvotes = downvotes.filter(id => id !== user.id);
    } else {
      downvotes.push(user.id);
      upvotes = upvotes.filter(id => id !== user.id); // Remove upvote if downvoting
    }
  } else if (customId === 'suggest_approve' || customId === 'suggest_deny') {
    // Check permission (Staff only)
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: "You do not have permission to approve/deny suggestions.", ephemeral: true });
    }

    const isApprove = customId === 'suggest_approve';
    suggestion.status = isApprove ? 'APPROVED' : 'DENIED';
    db.saveSuggestion(suggestion);

    // Update embeds
    const embed = message.embeds[0];
    const newEmbed = createEmbed({
      title: `Suggestion #${message.id.substring(message.id.length - 6)} [${suggestion.status}]`,
      description: suggestion.content,
      color: isApprove ? '#2ed573' : '#ff4757',
      fields: [
        { name: "Author", value: `<@${suggestion.user_id}>`, inline: true },
        { name: "Status", value: suggestion.status, inline: true },
        { name: "Votes", value: `👍 ${upvotes.length} | 👎 ${downvotes.length}`, inline: false }
      ]
    });

    await message.edit({ embeds: [newEmbed], components: [] });
    return interaction.reply({ content: `Suggestion has been ${isApprove ? 'approved' : 'denied'}.`, ephemeral: true });
  }

  // Save changes
  suggestion.votes_up = JSON.stringify(upvotes);
  suggestion.votes_down = JSON.stringify(downvotes);
  db.saveSuggestion(suggestion);

  // Update original embed votes count
  const embed = message.embeds[0];
  const color = suggestion.status === 'APPROVED' ? '#2ed573' : (suggestion.status === 'DENIED' ? '#ff4757' : '#1e1f29');
  
  const newEmbed = createEmbed({
    title: `Suggestion #${message.id.substring(message.id.length - 6)} [${suggestion.status}]`,
    description: suggestion.content,
    color: color,
    fields: [
      { name: "Author", value: `<@${suggestion.user_id}>`, inline: true },
      { name: "Status", value: suggestion.status, inline: true },
      { name: "Votes", value: `👍 ${upvotes.length} | 👎 ${downvotes.length}`, inline: false }
    ]
  });

  await message.edit({ embeds: [newEmbed] });
  await interaction.reply({ content: "Vote updated!", ephemeral: true });
}

module.exports = { handleInteraction };
