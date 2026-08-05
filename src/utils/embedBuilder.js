const { EmbedBuilder } = require('discord.js');
const config = require('../config/default.js');

/**
 * Creates a standardized Golem-branded embed
 * @param {object} options
 * @param {string} [options.title]
 * @param {string} [options.description]
 * @param {string} [options.color]
 * @param {Array<{name: string, value: string, inline?: boolean}>} [options.fields]
 * @param {string} [options.thumbnail]
 * @param {string} [options.image]
 * @param {object} [options.author]
 * @param {boolean} [options.timestamp=true]
 */
function createEmbed({
  title,
  description,
  color,
  fields,
  thumbnail,
  image,
  author,
  timestamp = true
} = {}) {
  const embed = new EmbedBuilder()
    .setColor(color || config.branding.color)
    .setFooter({ text: config.branding.footer });

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (fields && fields.length > 0) embed.addFields(fields);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (author) embed.setAuthor(author);
  if (timestamp) embed.setTimestamp();

  return embed;
}

module.exports = { createEmbed };
