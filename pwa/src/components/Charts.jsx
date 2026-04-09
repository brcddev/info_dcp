export const Charts = ({ sensorData }) => (
  <div class="card">
    <h3>📊 Графики датчиков</h3>
    <div class="sensor-list">
      {sensorData.length === 0 ? (
        <p class="empty">Нет данных датчиков</p>
      ) : (
        sensorData.slice(-10).map((data, idx) => (
          <div key={idx} class="sensor-item">
            <span class="sensor-name">{data.name}</span>
            <span class="sensor-value">{data.value} {data.unit}</span>
            <div class="sensor-bar" style={{ width: `${Math.min(100, data.value / 10)}%` }}></div>
          </div>
        ))
      )}
    </div>
  </div>
);