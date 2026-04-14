// backup.js
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const BACKUP_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

function backupFile(source, destName) {
  const dest = path.join(BACKUP_DIR, `${destName}_${Date.now()}.json`);
  fs.copyFileSync(source, dest);
  // Удаляем старые бэкапы (оставляем 10 последних)
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith(destName)).sort();
  while (files.length > 10) {
    fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
  }
}

// Запускаем каждые 24 часа
cron.schedule('0 2 * * *', () => {
  backupFile(path.join(__dirname, 'users.json'), 'users');
  backupFile(path.join(__dirname, 'esp_config.json'), 'esp_config');
  console.log('Auto backup completed');
});