// fcm.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

let fcmTokens = [];

function registerToken(token) {
  if (token && !fcmTokens.includes(token)) {
    fcmTokens.push(token);
    console.log(`✅ Зарегистрирован токен: ${token.substring(0, 30)}...`);
    return true;
  }
  return false;
}

async function sendFCMNotification(title, body, channel, espId, sensor) {
  if (fcmTokens.length === 0) {
    console.log('⚠️ Нет зарегистрированных токенов');
    return false;
  }
  
  const fcmData = { channel: channel || 'critical' };
  if (sensor) fcmData.sensor = JSON.stringify(sensor);
  if (espId) fcmData.espId = espId;
  
  const message = {
    notification: { title: title || 'ESP Alert', body: body || '' },
    data: fcmData,
    tokens: fcmTokens
  };
  
  const response = await admin.messaging().sendEachForMulticast(message);
  
  // Удаляем невалидные токены
  const invalidTokens = [];
  response.responses.forEach((resp, idx) => {
    if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
      invalidTokens.push(fcmTokens[idx]);
    }
  });
  
  if (invalidTokens.length > 0) {
    fcmTokens = fcmTokens.filter(t => !invalidTokens.includes(t));
    console.log(`🗑️ Удалено ${invalidTokens.length} невалидных токенов`);
  }
  
  return response;
}

module.exports = {
  registerToken,
  sendFCMNotification,
  getTokensCount: () => fcmTokens.length
};