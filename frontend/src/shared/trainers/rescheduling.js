function getTrainerSessionStartTime(booking) {
  return Date.parse(`${booking.sessionDate}T${booking.sessionTime}:00+07:00`);
}

export function isTrainerSessionPast(booking, now = Date.now()) {
  const startTime = getTrainerSessionStartTime(booking);
  return Number.isFinite(startTime) && now >= startTime;
}

export function isTrainerReschedulingClosed(booking, now = Date.now()) {
  const startTime = getTrainerSessionStartTime(booking);
  return !Number.isFinite(startTime) || now >= startTime - 30 * 60 * 1000;
}
