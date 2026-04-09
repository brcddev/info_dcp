// src/hooks/useServiceWorkerUpdater.js (пример)
import { useState, useEffect } from 'preact/hooks';

export function useServiceWorkerUpdater() {
    const [waitingWorker, setWaitingWorker] = useState(null);
    const [showReload, setShowReload] = useState(false);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            // Функция для проверки, не ожидает ли уже активации какой-либо worker
            const checkForWaitingWorker = async () => {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration && registration.waiting) {
                    console.log('[App] Найден ожидающий Service Worker.');
                    setWaitingWorker(registration.waiting);
                    setShowReload(true);
                }
            };

            // Регистрируем Service Worker
            const registerSW = async () => {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('[App] Service Worker зарегистрирован');

                // Проверяем, нет ли уже ожидающего worker'а (например, если пользователь проигнорировал предыдущее предложение)
                if (registration.waiting) {
                    setWaitingWorker(registration.waiting);
                    setShowReload(true);
                }

                // Слушаем событие обнаружения обновления
                registration.addEventListener('updatefound', () => {
                    console.log('[App] Обновление Service Worker найдено.');
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            // Когда новый worker успешно установлен и перешёл в состояние 'installed', он становится 'waiting'
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('[App] Новый Service Worker установлен и ожидает.');
                                setWaitingWorker(newWorker);
                                setShowReload(true);
                            }
                        });
                    }
                });
            };

            // Запускаем проверку и регистрацию
            checkForWaitingWorker();
            registerSW();

            // Слушаем событие, когда новый worker захватывает контроль
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('[App] Service Worker изменился. Перезагружаем страницу...');
                window.location.reload();
            });
        }
    }, []);

    // Функция, которую вы вызовете по нажатию кнопки
    const updateApp = () => {
        if (waitingWorker) {
            console.log('[App] Отправляем команду SKIP_WAITING ожидающему Service Worker.');
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
            setShowReload(false);
        }
    };

    return { showReload, updateApp };
}