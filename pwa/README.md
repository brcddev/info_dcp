# info_dcp – система уведомлений с ESP32 на PWA

- **PWA** – клиент на Preact + Vite, получает push через Firebase.
- **Gateway** – Node.js сервер, принимает HTTP‑запросы от ESP и отправляет FCM.
- **ESP32** – устройство на ESP‑IDF, отправляет тревожные сообщения на шлюз.

## Быстрый старт

1. Настройте Firebase проект (см. docs/setup.md).
2. Запустите шлюз: `cd gateway && npm start`.
3. Соберите и запустите PWA: `cd pwa && npm run dev`.
4. Прошейте ESP32 (пример кода в esp32/main/main.c).

Подробнее – в папке `docs/`.