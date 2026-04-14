// src/components/ESPSelector.jsx
import { useEffect, useState } from 'preact/hooks';
import { onEspList, getEspData, getEspHistory } from '../websocket';

export const ESPSelector = ({ selectedEsp, onSelectEsp }) => {
  const [espList, setEspList] = useState([]);
  
  useEffect(() => {
    onEspList((list) => {
      setEspList(list);
      // Если выбранного ESP нет в списке (например, удалён) - сбросить
      if (selectedEsp && !list.some(esp => esp.id === selectedEsp)) {
        if (list.length > 0) onSelectEsp(list[0].id);
      }
    });
  }, [selectedEsp]);
  
  const handleChange = (e) => {
    const espId = e.target.value;
    onSelectEsp(espId);
    getEspData(espId);
    getEspHistory(espId);
  };
  
  if (espList.length === 0) return <div class="esp-selector">⏳ Загрузка ESP...</div>;
  
  return (
    <div class="esp-selector">
      <label>📡 Выберите устройство: </label>
      <select value={selectedEsp || ''} onChange={handleChange}>
        {espList.map(esp => (
          <option key={esp.id} value={esp.id}>
            {esp.displayName || esp.id} {esp.lastData?.tTank ? `(${esp.lastData.tTank}°C)` : '(нет данных)'}
          </option>
        ))}
      </select>
    </div>
  );
};