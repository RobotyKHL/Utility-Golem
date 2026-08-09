/**
 * Config Auto-Merge
 * On startup, merges any keys missing from the live config.json using the
 * bundled template (src/config/defaultConfig.json). The user's existing
 * settings are never overwritten — only brand-new keys are added.
 * After an update with new config options, this runs before anything reads
 * config.json, so no manual reset is needed.
 */
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const CONFIG_PATH = path.join(process.cwd(), 'config.json');
const DEFAULT_PATH = path.join(__dirname, 'defaultConfig.json');

function deepMerge(live, tmpl, trail = '') {
  let added = [];
  for (const [key, tmplValue] of Object.entries(tmpl)) {
    const keyPath = trail ? `${trail}.${key}` : key;
    const liveValue = live[key];
    if (liveValue === undefined) {
      live[key] = JSON.parse(JSON.stringify(tmplValue));
      added.push(keyPath);
    } else if (
      tmplValue && typeof tmplValue === 'object' && !Array.isArray(tmplValue) &&
      liveValue && typeof liveValue === 'object' && !Array.isArray(liveValue)
    ) {
      added = added.concat(deepMerge(liveValue, tmplValue, keyPath));
    }
  }
  return added;
}

function mergeMissingConfigKeys() {
  if (!fs.existsSync(CONFIG_PATH)) {
    logger.warn('config.json not found — using defaults only.');
    try {
      fs.copyFileSync(DEFAULT_PATH, CONFIG_PATH);
    } catch (e) {
      logger.error(`Failed to create config.json from template: ${e.message}`);
    }
    return [];
  }
  if (!fs.existsSync(DEFAULT_PATH)) return [];

  let live, tmpl;
  try {
    live = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    tmpl = JSON.parse(fs.readFileSync(DEFAULT_PATH, 'utf8'));
  } catch (e) {
    logger.error(`Config merge skipped — cannot parse config files: ${e.message}`);
    return [];
  }

  const added = deepMerge(live, tmpl);
  if (added.length) {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(live, null, 2));
      logger.info(`Config updated automatically — new option(s) added (fill them in config.json): ${added.join(', ') || '(top-level)'}`);
    } catch (e) {
      logger.error(`Config merge failed to write config.json: ${e.message}`);
    }
  }
  return added;
}

module.exports = { mergeMissingConfigKeys };