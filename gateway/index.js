require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const app = express();
app.use(cors());
app.use(express.json());

let fcmTokens = [];

app.post('/api/register-token', (req, res) => {
  const { token } = req.body;
  if (token && !fcmTokens.includes(token)) fcmTokens.push(token);
  res.json({ success: true });
});

app.post('/api/send', async (req, res) => {
  const { title, body, data } = req.body;
  const message = {
    notification: { title: title || 'ESP Alert', body: body || '' },
    data: data || {},
    tokens: fcmTokens
  };
  const response = await admin.messaging().sendEachForMulticast(message);
  res.json({ success: true, results: response.responses });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Gateway on port ${PORT}`));