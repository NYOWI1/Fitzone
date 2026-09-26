export function isTrainerReschedulingClosed(booking, now = Date.now()) {
  const startTime = Date.parse(`${booking.sessionDate}T${booking.sessionTime}:00+07:00`);
  return !Number.isFinite(startTime) || now >= startTime - 30 * 60 * 1000;
}
