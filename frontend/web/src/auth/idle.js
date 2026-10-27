// Idle lock timing. Pure: the console calls `isIdle` on a timer with the last input time.
export const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];

export function isIdle(lastActiveMs, nowMs, minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return false;
  return nowMs - lastActiveMs >= minutes * 60_000;
}
