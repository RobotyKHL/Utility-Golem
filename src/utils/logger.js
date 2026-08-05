const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir);
    }
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${type}]: ${message}`;
    
    // Print to console with simple indicators
    switch (type) {
      case 'ERROR':
        console.error(`\x1b[31m${formattedMessage}\x1b[0m`);
        break;
      case 'WARN':
        console.warn(`\x1b[33m${formattedMessage}\x1b[0m`);
        break;
      case 'SUCCESS':
        console.log(`\x1b[32m${formattedMessage}\x1b[0m`);
        break;
      default:
        console.log(formattedMessage);
    }

    // Write to a log file
    fs.appendFileSync(
      path.join(this.logDir, 'golem.log'),
      formattedMessage + '\n'
    );
  }

  info(msg) { this.log(msg, 'INFO'); }
  error(msg) { this.log(msg, 'ERROR'); }
  warn(msg) { this.log(msg, 'WARN'); }
  success(msg) { this.log(msg, 'SUCCESS'); }
}

module.exports = new Logger();
