import { useEffect, useRef, useState } from 'preact/hooks';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

export const Charts = ({ sensorData }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [selectedSensors, setSelectedSensors] = useState(['Температура бака']);

  // Сохранение выбора в localStorage
  useEffect(() => {
    const saved = localStorage.getItem('selectedSensors');
    if (saved) setSelectedSensors(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('selectedSensors', JSON.stringify(selectedSensors));
  }, [selectedSensors]);

  const sensorOptions = [
    'Температура бака', 'Температура верха', 'Давление',
    'Heap (память)', 'RSSI', 'Мощность нагревателя'
  ];

  const toggleSensor = (sensor) => {
    if (selectedSensors.includes(sensor)) {
      if (selectedSensors.length > 1) {
        setSelectedSensors(selectedSensors.filter(s => s !== sensor));
      }
    } else {
      if (selectedSensors.length < 5) {
        setSelectedSensors([...selectedSensors, sensor]);
      }
    }
  };

  useEffect(() => {
    if (!chartRef.current) return;
    // Уничтожаем старый график
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    const ctx = chartRef.current.getContext('2d');
    const datasets = [];

    selectedSensors.forEach(sensorName => {
      const points = sensorData.filter(p => p.name === sensorName);
      if (points.length === 0) return;
      datasets.push({
        label: sensorName,
        data: points.map(p => ({ x: p.time, y: p.value })),
        borderColor: getColor(sensorName),
        backgroundColor: 'transparent',
        tension: 0.3,
        pointRadius: 2,
        fill: false,
      });
    });

    if (datasets.length === 0) return;

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { type: 'time', title: { display: true, text: 'Время' } },
          y: { title: { display: true, text: 'Значение' } }
        },
        plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.y}` } } }
      }
    });
  }, [sensorData, selectedSensors]);

  return (
    <div class="card">
      <h3>📊 Графики датчиков</h3>
      <div class="sensor-checkboxes">
        {sensorOptions.map(sensor => (
          <label key={sensor}>
            <input type="checkbox" checked={selectedSensors.includes(sensor)} onChange={() => toggleSensor(sensor)} />
            {sensor}
          </label>
        ))}
      </div>
      <div class="chart-container"><canvas ref={chartRef} height="300"></canvas></div>
      <div class="hint">Можно выбрать до 5 датчиков</div>
    </div>
  );
};

function getColor(name) {
  const colors = {
    'Температура бака': '#ff6384', 'Температура верха': '#36a2eb',
    'Давление': '#ffce56', 'Heap (память)': '#4bc0c0',
    'RSSI': '#9966ff', 'Мощность нагревателя': '#ff9f40'
  };
  return colors[name] || '#888';
}