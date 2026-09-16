let offset = 0;
export function serverNow() {
  return Date.now() + offset;
}
export function syncServerClock(now: number) {
  offset = now - Date.now();
}
