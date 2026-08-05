const logger = require('../utils/logger');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.success(`Logged in as ${client.user.tag}!`);
    
    // Set Bot Activity
    client.user.setActivity({
      name: 'over the server | /help',
      type: 3 // Watching
    });

    // Start Giveaway Scheduler
    const giveawayManager = require('../modules/giveaways/giveawayManager');
    giveawayManager.startScheduler(client);

    // Automatically deploy commands on startup
    if (process.env.CLIENT_ID) {
      await client.deployCommands();
    } else {
      logger.warn('CLIENT_ID not found in .env; skipping slash commands deployment.');
    }
  },
};
