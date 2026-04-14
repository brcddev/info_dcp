// src/components/Dashboard.jsx
import { useEffect, useState } from 'preact/hooks';
import { authFetch } from '../api';

export const Dashboard = () => {
  const [espList, setEspList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState('disconnected');

  useEffect(() => {
    // Загрузка списка ESP
    authFetch('/api/esp/list')
      .then(res => res.json())
      .then(data => {
        setEspList(data.espList || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    // Проверка статуса WebSocket (опционально)
    const ws = new WebSocket(`wss://${import.meta.env.VITE_GATEWAY_HOST}/ws`);
    ws.onopen = () => setWsStatus('connected');
    ws.onclose = () => setWsStatus('disconnected');
    ws.onerror = () => setWsStatus('error');
    return () => ws.close();
  }, []);

  if (loading) return <div class="loading">Загрузка...</div>;

  return (
    <div class="dashboard">
      <div class="status-bar">
        <span class={`ws-status ${wsStatus}`}>WebSocket: {wsStatus}</span>
      </div>
      <div class="esp-grid">
        {espList.length === 0 && <p>Нет подключённых ESP</p>}
        {espList.map(esp => (
          <div class="esp-card" key={esp.id}>
            <h3>{esp.displayName || esp.id}</h3>
            <div class="esp-data">
              <div>🌡️ Температура бака: {esp.lastData?.tTank ?? '—'}°C</div>
              <div>📊 Температура верха: {esp.lastData?.tTop ?? '—'}°C</div>
              <div>💾 Heap: {esp.lastData?.heap ?? '—'} байт</div>
              <div>📡 RSSI: {esp.lastData?.rssi ?? '—'} dBm</div>
              <div>🚨 Alarm: {esp.lastData?.alarm ? '🔴 ACTIVE' : '✅ OK'}</div>
              <div>⏱️ Последнее обновление: {esp.lastData?.timestamp ? new Date(esp.lastData.timestamp).toLocaleString() : 'никогда'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};