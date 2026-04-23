"""
Token bucket rate limiter per Gemini free tier.
gemini-2.5-flash:      10 RPM / 250 RPD
gemini-2.5-flash-lite: 15 RPM / 1000 RPD
"""

import time
import threading
import logging
from datetime import datetime, date

logger = logging.getLogger(__name__)


class GeminiRateLimiter:
    def __init__(self, rpm: int = 9, rpd: int = 240, name: str = "flash"):
        self.rpm = rpm
        self.rpd = rpd
        self.name = name
        self._minute_calls: list[float] = []
        self._day_calls: int = 0
        self._day_reset_date: date = date.today()
        self._lock = threading.Lock()

    def wait_if_needed(self):
        with self._lock:
            now = time.time()
            today = date.today()

            # Reset contatore giornaliero
            if today != self._day_reset_date:
                self._day_calls = 0
                self._day_reset_date = today

            # Check RPD
            if self._day_calls >= self.rpd:
                logger.warning("[rate_limiter:%s] Quota giornaliera esaurita (%d/%d)", self.name, self._day_calls, self.rpd)
                raise RuntimeError(f"Quota giornaliera Gemini {self.name} esaurita ({self._day_calls}/{self.rpd})")

            # Pulisci chiamate più vecchie di 60s
            self._minute_calls = [t for t in self._minute_calls if now - t < 60]

            # Check RPM
            if len(self._minute_calls) >= self.rpm:
                wait_time = 60 - (now - self._minute_calls[0]) + 0.5
                if wait_time > 0:
                    logger.info("[rate_limiter:%s] Rate limit raggiunto, attendo %.1fs", self.name, wait_time)
                    time.sleep(wait_time)
                    # Ricalcola dopo il sleep
                    now = time.time()
                    self._minute_calls = [t for t in self._minute_calls if now - t < 60]

            self._minute_calls.append(time.time())
            self._day_calls += 1
            logger.debug("[rate_limiter:%s] Chiamata %d/%d oggi", self.name, self._day_calls, self.rpd)


# Istanze globali — una per modello
flash_limiter = GeminiRateLimiter(rpm=9, rpd=240, name="flash")
flash_lite_limiter = GeminiRateLimiter(rpm=14, rpd=950, name="flash-lite")
