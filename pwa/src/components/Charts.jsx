// src/components/Charts.jsx
import { useEffect, useRef, useState } from 'preact/hooks';
import Chart from 'chart.js/auto';

export const Charts = ({ sensorData }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [selectedSensor, setSelectedSensor] = useState('all');
  
  // Получаем список уникальных сенсоров
  const sensors = ['all', ...new Set(sensorData.map(d => d.name))];
  
  // Фильтруем данные по выбранному сенсору
  const filteredData = selectedSensor === 'all' 
    ? sensorData 
    : sensorData.filter(d => d.name === selectedSensor);
  
  // Группируем по времени (последние 50 точек)
  const chartData = filteredData.slice(-50);
  
  useEffect(() => {
    if (!chartRef.current) return;
    
    // Уничтожаем старый график
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Создаём новый график
    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.map((_, idx) => idx + 1),
        datasets: selectedSensor === 'all' 
          ? sensors.filter(s => s !== 'all').map(sensorName => ({
              label: sensorName,
              data: chartData.filter(d => d.name === sensorName).map(d => d.value),
              borderColor: getColorForSensor(sensorName),
              backgroundColor: 'transparent',
              tension: 0.3,
              pointRadius: 3,
              pointHoverRadius: 5,
              fill: false
            }))
          : [{
              label: selectedSensor,
              data: chartData.map(d => d.value),
              borderColor: getColorForSensor(selectedSensor),
              backgroundColor: 'rgba(54, 162, 235, 0.1)',
              tension: 0.3,
              pointRadius: 4,
              pointHoverRadius: 6,
              fill: true
            }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.raw;
                const unit = getUnitForSensor(label);
                return `${label}: ${value} ${unit}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Значение'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Время (последние измерения)'
            },
            ticks: {
              maxRotation: 45,
              autoSkip: true
            }
          }
        }
      }
    });
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [chartData, selectedSensor, sensors]);
  
  // Функция для получения цвета сенсора
  const getColorForSensor = (name) => {
    const colors = {
      'Температура': '#ff6384',
      'Влажность': '#36a2eb',
      'Давление': '#ffce56',
      'DHT22': '#4bc0c0',
      'BMP280': '#9966ff',
      'default': '#ff9f40'
    };
    return colors[name] || colors.default;
  };
  
  // Функция для получения единицы измерения
  const getUnitForSensor = (name) => {
    const units = {
      'Температура': '°C',
      'Влажность': '%',
      'Давление': 'hPa',
      'DHT22': '°C',
      'BMP280': 'hPa'
    };
    return units[name] || '';
  };
  
  return (
    <div class="card">
      <h3>📊 Графики датчиков</h3>
      
      <div class="sensor-selector">
        <label>Выберите датчик: </label>
        <select value={selectedSensor} onChange={(e) => setSelectedSensor(e.target.value)}>
          {sensors.map(sensor => (
            <option key={sensor} value={sensor}>
              {sensor === 'all' ? '📈 Все датчики' : `📊 ${sensor}`}
            </option>
          ))}
        </select>
      </div>
      
      <div class="chart-container">
        <canvas ref={chartRef} width="100%" height="300"></canvas>
      </div>
      
      <div class="sensor-stats">
        <h4>📋 Последние показания</h4>
        <div class="stats-grid">
          {sensors.filter(s => s !== 'all').map(sensorName => {
            const lastData = sensorData.filter(d => d.name === sensorName).slice(-1)[0];
            if (!lastData) return null;
            return (
              <div key={sensorName} class="stat-card">
                <div class="stat-name">{sensorName}</div>
                <div class="stat-value">
                  {lastData.value} <span class="stat-unit">{getUnitForSensor(sensorName)}</span>
                </div>
                <div class="stat-time">{new Date(lastData.time).toLocaleTimeString()}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};