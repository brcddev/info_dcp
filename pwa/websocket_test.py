#!/usr/bin/env python3
"""
Скрипт для тестирования WebSocket подключения.
Требует установки библиотеки: pip install websockets
"""

import asyncio
import argparse
import sys
import ssl
import logging
from typing import Optional

try:
    import websockets
    from websockets.exceptions import WebSocketException, ConnectionClosed
except ImportError:
    print("Ошибка: не установлена библиотека 'websockets'.")
    print("Установите её командой: pip install websockets")
    sys.exit(1)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('websockets')
logger.setLevel(logging.DEBUG)
logger.addHandler(logging.StreamHandler())
async def test_websocket(
    url: str,
    send_message: Optional[str] = None,
    timeout: float = 10.0,
    ignore_ssl: bool = False,
) -> bool:
    """
    Тестирует WebSocket подключение.

    Аргументы:
        url: URL WebSocket сервера (например, ws://echo.websocket.org)
        send_message: Сообщение для отправки (если None, только подключение)
        timeout: Таймаут операций в секундах
        ignore_ssl: Игнорировать ошибки SSL сертификата

    Возвращает:
        True если тест успешен, иначе False
    """
    ssl_context = None
    if url.startswith("wss://") and ignore_ssl:
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

    try:
        # Функция подключения с таймаутом (работает во всех версиях Python 3.7+)
        async def connect_and_test():
            async with websockets.connect(url, ssl=ssl_context) as websocket:
                print(f"✓ Подключение к {url} установлено")

                if send_message:
                    print(f"→ Отправка: {send_message}")
                    await websocket.send(send_message)

                    response = await websocket.recv()
                    print(f"← Получено: {response}")

                    if send_message == response:
                        print("✓ Ответ совпадает с отправленным сообщением")
                    else:
                        print("⚠ Ответ отличается от отправленного сообщения")
                else:
                    print("✓ Тест без отправки сообщения пройден")

                await websocket.close()
                print("✓ Соединение закрыто")
                return True

        # Применяем таймаут ко всей операции
        return await asyncio.wait_for(connect_and_test(), timeout=timeout)

    except asyncio.TimeoutError:
        print(f"✗ Таймаут ({timeout} сек) при подключении к {url}")
    except ConnectionRefusedError:
        print(f"✗ Соединение отклонено: {url}")
    except websockets.InvalidURI:
        print(f"✗ Неверный URI: {url}")
    except websockets.InvalidHandshake as e:
        print(f"✗ Ошибка рукопожатия: {e}")
    except WebSocketException as e:
        print(f"✗ WebSocket ошибка: {e}")
    except Exception as e:
        print(f"✗ Непредвиденная ошибка: {type(e).__name__}: {e}")
    return False


async def main():
    parser = argparse.ArgumentParser(description="Тестирование WebSocket подключения")
    parser.add_argument("url", help="WebSocket URL (например, ws://localhost:8080)")
    parser.add_argument(
        "-m", "--message",
        help="Сообщение для отправки (сервер должен вернуть эхо)",
    )
    parser.add_argument(
        "-t", "--timeout", type=float, default=10.0,
        help="Таймаут в секундах (по умолчанию 10)",
    )
    parser.add_argument(
        "--ignore-ssl", action="store_true",
        help="Игнорировать ошибки SSL сертификата (для wss://)",
    )
    parser.add_argument(
        "--retries", type=int, default=1,
        help="Количество попыток при неудаче (по умолчанию 1)",
    )
    parser.add_argument(
        "--delay", type=float, default=1.0,
        help="Задержка между попытками в секундах",
    )

    args = parser.parse_args()

    for attempt in range(1, args.retries + 1):
        if attempt > 1:
            print(f"\nПопытка {attempt}/{args.retries} (задержка {args.delay} сек)...")
            await asyncio.sleep(args.delay)

        success = await test_websocket(
            url=args.url,
            send_message=args.message,
            timeout=args.timeout,
            ignore_ssl=args.ignore_ssl,
        )

        if success:
            print("\n✅ Тест пройден успешно")
            sys.exit(0)
        else:
            print(f"\n❌ Попытка {attempt} не удалась")

    print("\n❌ Все попытки провалились")
    sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nПрервано пользователем")
        sys.exit(130)