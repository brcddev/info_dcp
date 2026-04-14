// esp-storage.js
const fs = require('fs');
const path = require('path');
const { getAllEspConfigs } = require('./esp-config');

const MAX_HISTORY = require('./config').MAX_HISTORY;

// Директория для хранения данных
const DATA_DIR = path.join(__dirname, 'data');
const ESP_DATA_FILE = (espId) => path.join(DATA_DIR, `${espId}.json`);
const ESP_INDEX_FILE = path.join(DATA_DIR, 'index.json');

// Убеждаемся, что директория существует
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Хранилище в памяти (для быстрого доступа)
const espData = new Map();      // espId -> lastData
const espHistory = new Map();   // espId -> [history]

// ========== ЗАГРУЗКА ДАННЫХ ПРИ СТАРТЕ ==========
function loadEspData(espId) {
  const filePath = ESP_DATA_FILE(espId);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      espHistory.set(espId, data.history || []);
      espData.set(espId, data.lastData || null);
      console.log(`📂 Загружена история для ESP ${espId}: ${data.history?.length || 0} записей`);
    } catch (e) {
      console.error(`Ошибка загрузки ${espId}:`, e.message);
    }
  }
}

function loadAllEspData() {
  if (fs.existsSync(ESP_INDEX_FILE)) {
    try {
      const index = JSON.parse(fs.readFileSync(ESP_INDEX_FILE, 'utf8'));
      for (const espId of index.espIds || []) {
        loadEspData(espId);
      }
    } catch (e) {
      console.error('Ошибка загрузки индекса:', e.message);
    }
  }
}

// ========== СОХРАНЕНИЕ ДАННЫХ НА ДИСК ==========
function saveEspDataToDisk(espId) {
  const filePath = ESP_DATA_FILE(espId);
  const history = espHistory.get(espId) || [];
  const lastData = espData.get(espId);
  
  const dataToSave = {
    espId,
    lastUpdate: Date.now(),
    lastData: lastData,
    history: history.slice(-MAX_HISTORY), // сохраняем последние MAX_HISTORY записей
    totalRecords: history.length
  };
  
  fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));
  
  // Обновляем индекс
  updateIndex(espId);
}

function updateIndex(espId) {
  let index = { espIds: [], lastUpdate: Date.now() };
  
  if (fs.existsSync(ESP_INDEX_FILE)) {
    try {
      index = JSON.parse(fs.readFileSync(ESP_INDEX_FILE, 'utf8'));
    } catch (e) {}
  }
  
  if (!index.espIds.includes(espId)) {
    index.espIds.push(espId);
  }
  
  fs.writeFileSync(ESP_INDEX_FILE, JSON.stringify(index, null, 2));
}

// ========== ОСНОВНЫЕ ФУНКЦИИ ==========
function saveEspData(espId, data) {
  const timestamp = Date.now();
  const record = {
    timestamp,
    time: data.time || Math.floor(timestamp / 1000),
    ...data
  };
  
  // Сохраняем в память
  espData.set(espId, record);
  
  if (!espHistory.has(espId)) {
    espHistory.set(espId, []);
    loadEspData(espId); // подгружаем историю с диска если есть
  }
  
  const history = espHistory.get(espId);
  history.push(record);
  
  // Ограничиваем размер в памяти
  while (history.length > MAX_HISTORY) {
    history.shift();
  }
  
  // Асинхронно сохраняем на диск (не блокируем)
  setImmediate(() => {
    saveEspDataToDisk(espId);
  });
  
  console.log(`📊 Данные от ESP[${espId}]: tTank=${data.tTank}°C, heap=${data.heap}, всего записей: ${history.length}`);
  
  return record;
}

function getEspData(espId) {
  return espData.get(espId) || null;
}

function getEspHistory(espId, limit = 100) {
  const history = espHistory.get(espId) || [];
  return history.slice(-limit);
}

function getAllEspIds() {
  return Array.from(espData.keys());
}

function getEspList() {
  const configs = getAllEspConfigs(); // { espId: { displayName, apiKey, telegram, ... } }
  const result = [];
  for (const [id, cfg] of Object.entries(configs)) {
    const lastData = espData.get(id) || null;
    result.push({
      id,
      displayName: cfg.displayName || id,
      apiKey: cfg.apiKey,
      telegram: cfg.telegram || { enabled: false },
      lastData,
      historyCount: (espHistory.get(id) || []).length
    });
  }
  return result;
}

function registerEsp(espId) {
  if (!espData.has(espId)) {
    espData.set(espId, null); // пока нет данных, но ESP известен
    espHistory.set(espId, []);
    updateIndex(espId);
    console.log(`🆕 ESP зарегистрирован: ${espId}`);
    return true;
  }
  return false;
}
function initEsp(espId) {
  if (!espData.has(espId)) {
    espData.set(espId, null);
    espHistory.set(espId, []);
    console.log(`🆕 ESP инициализирован в хранилище: ${espId}`);
  }
}
// Экспорт истории в CSV (для аналитики)
function exportHistoryToCSV(espId) {
  const history = getEspHistory(espId);
  if (history.length === 0) return null;
  
  const headers = ['timestamp', 'time', 'tTank', 'tTop', 'heap', 'rssi', 'alarm'];
  const rows = history.map(record => [
    record.timestamp,
    record.time,
    record.tTank,
    record.tTop,
    record.heap,
    record.rssi,
    record.alarm
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  const csvPath = path.join(DATA_DIR, `${espId}_export_${Date.now()}.csv`);
  fs.writeFileSync(csvPath, csvContent);
  console.log(`📁 Экспорт CSV сохранён: ${csvPath}`);
  return csvPath;
}

// Загружаем все данные при старте
loadAllEspData();

// Периодическое принудительное сохранение (каждые 5 минут)
setInterval(() => {
  for (const espId of getAllEspIds()) {
    saveEspDataToDisk(espId);
  }
  console.log('💾 Автосохранение истории выполнено');
}, 5 * 60 * 1000);

module.exports = {
  saveEspData,
  getEspData,
  getEspHistory,
  getAllEspIds,
  getEspList,
  exportHistoryToCSV,
  registerEsp,
  initEsp,
  getEspList
};