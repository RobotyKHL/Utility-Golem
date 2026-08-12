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

// Minimal .env loader — mirrors start.sh's behaviour: values already present
// in the panel environment win over the file.
function loadEnvFile(file) {
  if (!fileExists(file)) return false;
  try {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const idx = line.indexOf('=');
      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();
      if (value.startsWith('"')  && value.endsWith('"'))  value = value.slice(1, -1);
      if (value.startsWith("'")  && value.endsWith("'"))  value = value.slice(1, -1);
      if (process.env[key] === undefined) process.env[key] = value;
    }
    return true;
  } catch (e) {
    return false;
  }
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
    run(`curl -fsSL --retry 5 --retry-delay 5 --retry-all-errors "${REPO_ZIP}" -o "${TMP_TAR}"`);

    // Extract tar.gz
    run(`tar -xzf "${TMP_TAR}" -C /tmp/`);

    // Back up user's config.json, .env, and database before overwriting
    const configDest   = path.join(CONTAINER, 'config.json');
    const configBackup = path.join(CONTAINER, 'config.json.bak');
    const envDest      = path.join(CONTAINER, '.env');
    const envBackup    = path.join(CONTAINER, '.env.bak');
    const dbDest       = path.join(CONTAINER, 'golem_db.json');
    const dbBackup     = path.join(CONTAINER, 'golem_db.json.bak');

    if (fileExists(configDest)) { fs.copyFileSync(configDest, configBackup); console.log('[Golem] config.json backed up.'); }
    if (fileExists(envDest))    { fs.copyFileSync(envDest, envBackup);       console.log('[Golem] .env backed up.'); }
    if (fileExists(dbDest))     { fs.copyFileSync(dbDest, dbBackup);         console.log('[Golem] golem_db.json backed up (XP + data safe).'); }

    // Copy extracted files to container (overwrite)
    run(`cp -r "${TMP_DIR}/." "${CONTAINER}/"`);

    // Restore all protected files
    if (fileExists(configBackup)) { fs.copyFileSync(configBackup, configDest); fs.unlinkSync(configBackup); console.log('[Golem] config.json restored — your settings are safe!'); }
    if (fileExists(envBackup))    { fs.copyFileSync(envBackup, envDest);       fs.unlinkSync(envBackup);    console.log('[Golem] .env restored — your credentials are safe!'); }
    if (fileExists(dbBackup))     { fs.copyFileSync(dbBackup, dbDest);         fs.unlinkSync(dbBackup);     console.log('[Golem] golem_db.json restored — XP and data safe!'); }


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
const pkgJsonPath = path.join(CONTAINER, 'package.json');
const nodeModules = path.join(CONTAINER, 'node_modules');
const pkgJsonTime = fileExists(pkgJsonPath) ? fs.statSync(pkgJsonPath).mtimeMs : 0;
const lockTime = fileExists(path.join(CONTAINER, 'package-lock.json')) ? fs.statSync(path.join(CONTAINER, 'package-lock.json')).mtimeMs : 0;
const nodeModulesTime = fileExists(nodeModules) ? fs.statSync(nodeModules).mtimeMs : 0;

// Install if missing, or if package.json/lock is newer than node_modules
// (new dependencies were added to the repo).
if (!fileExists(path.join(CONTAINER, 'node_modules', 'discord.js')) ||
    pkgJsonTime > nodeModulesTime || lockTime > nodeModulesTime) {
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
// Load .env if present, so next (and only next) the panel variables,
// .env satisfies configuration (this matches how src/index.js loads dotenv).
loadEnvFile(path.join(CONTAINER, '.env'));

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
