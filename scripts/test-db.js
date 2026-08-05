const db = require('../src/database/db');
const logger = require('../src/utils/logger');

function runTest() {
  logger.info("Running database validation checks...");
  
  // Initialize Database
  db.init();

  // Test Guild Settings
  const testGuildId = "123456789012345678";
  logger.info("Testing Guild Settings read/write...");
  
  const settingsBefore = db.getGuildSettings(testGuildId);
  if (!settingsBefore || settingsBefore.welcome_enabled !== 0) {
    logger.error("Guild settings initialization test failed!");
    process.exit(1);
  }
  
  db.updateGuildSettings(testGuildId, "welcome_enabled", 1);
  const settingsAfter = db.getGuildSettings(testGuildId);
  if (settingsAfter.welcome_enabled !== 1) {
    logger.error("Guild settings write/read test failed!");
    process.exit(1);
  }
  logger.success("Guild settings tests passed.");

  // Test Warning System
  logger.info("Testing Warning logs...");
  db.addWarning(testGuildId, "9999", "8888", "Test Warning");
  const warnings = db.getWarnings(testGuildId, "9999");
  if (warnings.length === 0 || warnings[0].reason !== "Test Warning") {
    logger.error("Warning logs read/write test failed!");
    process.exit(1);
  }
  
  db.clearWarnings(testGuildId, "9999");
  const warningsCleared = db.getWarnings(testGuildId, "9999");
  if (warningsCleared.length !== 0) {
    logger.error("Warning clear test failed!");
    process.exit(1);
  }
  logger.success("Warning tests passed.");

  // Test Leveling
  logger.info("Testing leveling system storage...");
  db.saveUserLevel(testGuildId, "9999", 50, 2, Date.now());
  const stats = db.getUserLevel(testGuildId, "9999");
  if (stats.xp !== 50 || stats.level !== 2) {
    logger.error("Leveling read/write test failed!");
    process.exit(1);
  }
  logger.success("Leveling tests passed.");

  logger.success("All Golem database schema checks passed successfully!");
}

runTest();
