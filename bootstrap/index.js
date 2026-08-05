/**
 * Golem Bot - Bootstrap Launcher
 * ================================
 * Upload this file + the package.json in this folder to /home/container/
 * Then hit Start. This script will:
 *   1. Download the full bot from GitHub
 *   2. Run npm install
 *   3. Launch the bot automatically
 *
 * NO GIT REQUIRED. Works on any Node.js host.
 */

const { execSync, spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');

const REPO_ZIP  = 'https://github.com/wayback09/Utility-Golem-/archive/refs/heads/main.tar.gz';
const CONTAINER = '/home/container';
const TMP_TAR   = '/tmp/golem.tar.gz';
const TMP_DIR   = '/tmp/Utility-Golem--main';

// ─── Helpers ───────────────────────────────────────────────
function run(cmd, opts = {}) {
  console.log(`[Golem] $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function fileExists(p) {
  return fs.existsSync(p);
}

// ─── Banner ────────────────────────────────────────────────
console.log('');
console.log('  ██████╗  ██████╗ ██╗     ███████╗███╗   ███╗');
console.log('  ██╔════╝ ██╔═══██╗██║     ██╔════╝████╗ ████║');
console.log('  ██║  ███╗██║   ██║██║     █████╗  ██╔████╔██║');
console.log('  ██║   ██║██║   ██║██║     ██╔══╝  ██║╚██╔╝██║');
console.log('  ╚██████╔╝╚██████╔╝███████╗███████╗██║ ╚═╝ ██║');
console.log('   ╚═════╝  ╚═════╝ ╚══════╝╚══════╝╚═╝     ╚═╝');
console.log('           Server Guardian  ~  Bootstrap v1.0');
console.log('');

// ─── STEP 1: Download bot files if not present ─────────────
if (!fileExists(path.join(CONTAINER, 'src'))) {
  console.log('[Golem] First launch detected — downloading bot files from GitHub...');
  console.log('');

  try {
    // Download tar.gz (tar is always available on Linux, unlike unzip)
    run(`curl -fsSL "${REPO_ZIP}" -o "${TMP_TAR}"`);

    // Extract tar.gz
    run(`tar -xzf "${TMP_TAR}" -C /tmp/`);

    // Back up user's config.json and .env before overwriting
    const configDest  = path.join(CONTAINER, 'config.json');
    const configBackup = path.join(CONTAINER, 'config.json.bak');
    const envDest      = path.join(CONTAINER, '.env');
    const envBackup    = path.join(CONTAINER, '.env.bak');

    if (fileExists(configDest)) {
      fs.copyFileSync(configDest, configBackup);
      console.log('[Golem] config.json backed up.');
    }
    if (fileExists(envDest)) {
      fs.copyFileSync(envDest, envBackup);
      console.log('[Golem] .env backed up.');
    }

    // Copy extracted files to container (overwrite)
    run(`cp -r "${TMP_DIR}/." "${CONTAINER}/"`);

    // Restore user's config.json and .env
    if (fileExists(configBackup)) {
      fs.copyFileSync(configBackup, configDest);
      fs.unlinkSync(configBackup);
      console.log('[Golem] config.json restored — your settings are safe!');
    }
    if (fileExists(envBackup)) {
      fs.copyFileSync(envBackup, envDest);
      fs.unlinkSync(envBackup);
      console.log('[Golem] .env restored — your credentials are safe!');
    }

    // Clean up
    run(`rm -rf "${TMP_TAR}" "${TMP_DIR}"`);

    console.log('');
    console.log('[Golem] Bot files downloaded successfully!');
  } catch (err) {
    console.error('[Golem] ERROR: Failed to download bot files.');
    console.error('[Golem] Details:', err.message);
    console.error('[Golem] Make sure the server has internet access and try again.');
    process.exit(1);
  }
} else {
  console.log('[Golem] Bot files already present — skipping download.');
}

console.log('');

// ─── STEP 2: Install dependencies ──────────────────────────
if (!fileExists(path.join(CONTAINER, 'node_modules', 'discord.js'))) {
  console.log('[Golem] Installing Node.js dependencies (this may take 30-60s)...');
  console.log('');

  try {
    run('npm install --omit=dev', { cwd: CONTAINER });
    console.log('');
    console.log('[Golem] Dependencies installed successfully!');
  } catch (err) {
    console.error('[Golem] ERROR: npm install failed.');
    console.error('[Golem] Details:', err.message);
    process.exit(1);
  }
} else {
  console.log('[Golem] node_modules already installed — skipping npm install.');
}

console.log('');

// ─── STEP 3: Validate environment ──────────────────────────
if (!process.env.DISCORD_TOKEN) {
  console.warn('[Golem] WARNING: DISCORD_TOKEN is not set!');
  console.warn('[Golem]          Upload a .env file or set it in the panel variables.');
  console.warn('[Golem]          The bot will start but cannot connect to Discord.');
  console.warn('');
}

if (!process.env.CLIENT_ID) {
  console.warn('[Golem] WARNING: CLIENT_ID is not set — slash commands will not deploy.');
  console.warn('');
}

// ─── STEP 4: Launch Golem ──────────────────────────────────
console.log('[Golem] ====================================');
console.log('[Golem]  Launching Golem Bot...');
console.log('[Golem] ====================================');
console.log('');

const bot = spawn('node', [path.join(CONTAINER, 'src', 'index.js')], {
  cwd: CONTAINER,
  stdio: 'inherit',
  env: process.env
});

bot.on('error', (err) => {
  console.error('[Golem] Failed to launch bot process:', err.message);
  process.exit(1);
});

bot.on('exit', (code) => {
  console.log(`[Golem] Bot process exited with code ${code}`);
  process.exit(code || 0);
});
