import { useEffect, useState } from 'react';
import {
  getClassBookingCounts,
  getClassBookings,
  getClassSchedule,
  getTrainers,
  toggleClassBooking
} from '../../../../shared/api';

const filters = ['All', 'Strength', 'HIIT', 'Yoga', 'Cycling', 'Combat'];
const categories = {
  All: null,
  Strength: 'STR',
  HIIT: 'HIIT',
  Yoga: 'YOGA',
  Cycling: 'BIKE',
  Combat: 'CORE'
};
const accentClasses = {
  gray: 'before:bg-[#b8b8b8]',
  green: 'before:bg-[#30ff00]',
  red: 'before:bg-[#e6002e]',
  teal: 'before:bg-[#05735e]',
  yellow: 'before:bg-[#ffd54f]'
};
const badgeClasses = {
  gray: 'bg-[#b8b8b8] text-white',
  green: 'bg-[#30ff00] text-[#101010]',
  red: 'bg-[#e6002e] text-white',
  teal: 'bg-[#05735e] text-white',
  yellow: 'bg-[#ffd54f] text-[#101010]'
};
const classCancellationCutoffMs = 30 * 60 * 1000;
const gymUtcOffsetMinutes = 7 * 60;

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getBookingDays() {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  return Array.from({ length: 14 }, (_, index) => {
    const weekIndex = Math.floor(index / 7);
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + (index % 7) + weekIndex * 7);
    const isToday = date.toDateString() === today.toDateString();

    return {
      day: date.getDay(),
      date: date.getDate(),
      isoDate: formatIsoDate(date),
      weekIndex,
      label: isToday
        ? 'Today'
        : new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)
    };
  });
}

function getMembershipBookingPeriod(membershipAccess) {
  const startDate = membershipAccess?.currentPeriodStart
    ? formatIsoDate(new Date(membershipAccess.currentPeriodStart * 1000))
    : membershipAccess?.currentPeriodStartDate || '';
  const endDate = membershipAccess?.currentPeriodEnd
    ? formatIsoDate(new Date(membershipAccess.currentPeriodEnd * 1000))
    : membershipAccess?.currentPeriodEndDate || '';

  return { startDate, endDate };
}

function formatPeriodResetDate(isoDate) {
  if (!isoDate) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(new Date(`${isoDate}T00:00:00`));
}

function formatClassTime(time) {
  return time.replaceAll('am', ' AM').replaceAll('pm', ' PM').toUpperCase();
}

function getClassStartTimeMs(classDate, classTime) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(classDate || '');
  const timeMatch = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(classTime || '');

  if (!dateMatch || !timeMatch) return Number.NaN;

  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const meridiem = String(timeMatch[3] || '').toUpperCase();

  if (meridiem) {
    hour %= 12;
    if (meridiem === 'PM') hour += 12;
  }

  if (hour > 23 || minute > 59) return Number.NaN;

  return (
    Date.UTC(
      Number(dateMatch[1]),
      Number(dateMatch[2]) - 1,
      Number(dateMatch[3]),
      hour,
      minute
    ) -
    gymUtcOffsetMinutes * 60 * 1000
  );
}

function getClassTitleSize(name) {
  const titleLength = String(name || '')
    .replace('®', '')
    .trim().length;

  if (titleLength > 26) return 'text-[10px]';
  if (titleLength > 22) return 'text-[11px]';
  if (titleLength > 18) return 'text-[13px]';
  if (titleLength > 14) return 'text-sm';
  return 'text-[17px]';
}

function getTrainerName(trainers, trainerIndex, fallbackIndex) {
  const trainer = trainers[trainerIndex ?? fallbackIndex];
  return trainer?.name
    ? `Coach ${trainer.name.split(' ')[0]}`
    : `Coach ${fallbackIndex + 1}`;
}

function getClassesForDate(schedule, classDate, trainers, bookingCounts) {
  const weekday = new Date(`${classDate}T00:00:00`).getDay();
  const daySchedule = schedule.find((item) => item.weekday === weekday);

  if (!daySchedule) {
    return [];
  }

  return [...(daySchedule.morning || []), ...(daySchedule.evening || [])].map(
    (classItem, index) => {
      const id = `${classDate}-${classItem.name}-${classItem.time}-${index}`;
      const capacity = Number(classItem.capacity) || 10;
      const bookedCount = Number(bookingCounts[id] || 0);

      return {
        ...classItem,
        availableSpots: Math.max(capacity - bookedCount, 0),
        capacity,
        classDate,
        id,
        trainerName: getTrainerName(trainers, classItem.trainerIndex, index)
      };
    }
  );
}

export default function ClassesPage({ user = null, membershipAccess = null }) {
  const [schedule, setSchedule] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingCounts, setBookingCounts] = useState({});
  const [status, setStatus] = useState('loading');
  const [activeFilter, setActiveFilter] = useState('All');
  const [savingClassId, setSavingClassId] = useState('');
  const [message, setMessage] = useState('');
  const bookingDays = getBookingDays();
  const today = formatIsoDate(new Date());
  const [activeClassDate, setActiveClassDate] = useState(
    () =>
      getBookingDays().find((day) => day.isoDate >= formatIsoDate(new Date()))
        ?.isoDate || getBookingDays()[0].isoDate
  );
  const memberEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    '';
  const memberName = user?.fullName || 'Member';
  const bookedClassIds = new Set(bookings.map((booking) => booking.classId));
  const classes = getClassesForDate(
    schedule,
    activeClassDate,
    trainers,
    bookingCounts
  );
  const visibleClasses = classes.filter(
    (item) =>
      !categories[activeFilter] || item.category === categories[activeFilter]
  );
  const classesToday = getClassesForDate(
    schedule,
    today,
    trainers,
    bookingCounts
  ).length;
  const currentWeekDates = new Set(
    bookingDays.filter((day) => day.weekIndex === 0).map((day) => day.isoDate)
  );
  const bookedThisWeek = bookings.filter((booking) =>
    currentWeekDates.has(booking.classDate)
  ).length;
  const planSlug = String(
    membershipAccess?.planSlug || membershipAccess?.planName || ''
  ).toLowerCase();
  const bookingPeriod = getMembershipBookingPeriod(membershipAccess);
  const hasBookingPeriod = Boolean(
    bookingPeriod.startDate && bookingPeriod.endDate
  );
  const standardBookingsUsed = bookings.filter(
    (booking) =>
      booking.classDate >= bookingPeriod.startDate &&
      booking.classDate < bookingPeriod.endDate
  ).length;

  useEffect(() => {
    let isCurrent = true;

    async function loadPage() {
      try {
        const [nextSchedule, nextTrainers, nextCounts, nextBookings] =
          await Promise.all([
            getClassSchedule(),
            getTrainers(),
            getClassBookingCounts().catch(() => ({})),
            memberEmail ? getClassBookings(memberEmail).catch(() => []) : []
          ]);

        if (isCurrent) {
          setSchedule(nextSchedule);
          setTrainers(nextTrainers);
          setBookingCounts(nextCounts);
          setBookings(nextBookings);
          setStatus('ready');
        }
      } catch (error) {
        console.error(error);
        if (isCurrent) setStatus('error');
      }
    }

    loadPage();
    return () => {
      isCurrent = false;
    };
  }, [memberEmail]);

  useEffect(() => {
    if (!message) return undefined;
    const timeoutId = window.setTimeout(() => setMessage(''), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  async function handleBooking(classItem) {
    if (!memberEmail) {
      setMessage('Sign in with Clerk before booking a class.');
      return;
    }

    try {
      setSavingClassId(classItem.id);
      const result = await toggleClassBooking({
        memberEmail,
        memberName,
        classId: classItem.id,
        className: classItem.name,
        classTime: formatClassTime(classItem.time),
        classDate: activeClassDate,
        trainerName: classItem.trainerName,
        category: classItem.category,
        capacity: classItem.capacity
      });
      setBookings(result.bookings || []);
      setBookingCounts(result.bookingCounts || {});
      setMessage(
        result.booked
          ? 'Class booked. Your schedule has been updated.'
          : 'Class booking removed.'
      );
    } catch (error) {
      console.error(error);
      setMessage(error.message || 'Unable to update class booking.');
    } finally {
      setSavingClassId('');
    }
  }

  return (
    <section className='min-w-0 pb-6'>
      <header>
        <h1 className='m-0 mb-2 text-3xl font-black leading-none sm:text-[38px]'>
          Classes
        </h1>
        <p className='m-0 text-sm text-[#bdbdbd] sm:text-base'>
          Book your next workout class and manage your schedule.
        </p>
      </header>

      <div className='mt-6 grid grid-cols-1 gap-5 sm:max-w-96 sm:grid-cols-2'>
        {[
          [classesToday, 'Classes Today', '#e6002e'],
          [bookedThisWeek, 'Booked', '#30ff00']
        ].map(([value, label, color]) => (
          <article
            className='grid min-h-23.5 grid-cols-[46px_minmax(0,1fr)] items-center rounded-[28px] border border-[#414141] bg-[#252525] px-5 py-4 shadow-[0_24px_70px_rgba(0,0,0,0.38)]'
            key={label}
          >
            <strong className='text-[32px] leading-none' style={{ color }}>
              {value}
            </strong>
            <div>
              <b className='block text-[13px] leading-tight'>{label}</b>
              <small className='mt-1 block text-xs text-[#bdbdbd]'>
                This week
              </small>
            </div>
          </article>
        ))}
      </div>

      {planSlug === 'basic' && (
        <p className='mt-4 text-sm font-bold text-[#ff8ea2]'>
          Basic membership does not include class bookings.
        </p>
      )}
      {planSlug === 'standard' && (
        <p className='mt-4 text-sm font-bold text-[#bdbdbd]'>
          Standard bookings: {standardBookingsUsed} of 3 used
          {bookingPeriod.endDate
            ? ` · Resets ${formatPeriodResetDate(bookingPeriod.endDate)}`
            : ''}
          .
        </p>
      )}
      {planSlug === 'premium' && (
        <p className='mt-4 text-sm font-bold text-[#bdbdbd]'>
          Premium membership includes unlimited class bookings.
        </p>
      )}

      <div className='mt-7 max-w-158 space-y-4'>
        {[0, 1].map((weekIndex) => (
          <section key={weekIndex}>
            <p className='mb-2.5 mt-0 text-xs font-black text-[#bdbdbd]'>
              {weekIndex === 0 ? 'This week' : 'Next week'}
            </p>
            <div className='grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-7'>
              {bookingDays
                .filter((day) => day.weekIndex === weekIndex)
                .map((day) => (
                  <button
                    className={
                      day.isoDate === activeClassDate
                        ? 'min-h-14 rounded-full border border-[#e6002e] bg-[#e6002e] px-5 font-black text-white'
                        : 'min-h-14 rounded-full border border-[#414141] bg-[#252525] px-5 font-black text-white hover:border-[#e6002e]'
                    }
                    key={day.isoDate}
                    onClick={() => setActiveClassDate(day.isoDate)}
                    type='button'
                  >
                    <strong className='block text-[13px] leading-none'>
                      {day.label}
                    </strong>
                    <span className='mt-2 block text-xs text-[#bdbdbd]'>
                      {day.date}
                    </span>
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>

      <div className='mt-5 flex flex-wrap gap-3'>
        {filters.map((filter) => (
          <button
            className={
              filter === activeFilter
                ? 'min-h-9 rounded-full border border-[#e6002e] bg-transparent px-5 text-xs font-black text-white'
                : 'min-h-9 rounded-full border border-[#414141] bg-[#252525] px-5 text-xs font-black text-[#bdbdbd]'
            }
            key={filter}
            onClick={() => setActiveFilter(filter)}
            type='button'
          >
            {filter}
          </button>
        ))}
      </div>

      {status !== 'ready' && (
        <p
          className={`mt-7 rounded-3xl border border-[#414141] bg-[#252525] px-5 py-6 text-sm font-black ${status === 'error' ? 'text-[#ff8ea2]' : 'text-white'}`}
        >
          {status === 'error'
            ? 'Class schedule is unavailable.'
            : 'Loading classes...'}
        </p>
      )}
      {status === 'ready' && visibleClasses.length === 0 && (
        <p className='mt-7 rounded-3xl border border-[#414141] bg-[#252525] px-5 py-6 text-sm font-black'>
          No classes match this view.
        </p>
      )}

      {status === 'ready' && visibleClasses.length > 0 && (
        <div className='mt-7 flex flex-wrap items-stretch gap-6'>
          {visibleClasses.map((classItem) => {
            const isBooked = bookedClassIds.has(classItem.id);
            const isFull = classItem.availableSpots === 0;
            const classStartTime = getClassStartTimeMs(
              classItem.classDate,
              classItem.time
            );
            const classStarted =
              Number.isFinite(classStartTime) && Date.now() >= classStartTime;
            const cancellationClosed =
              isBooked &&
              Number.isFinite(classStartTime) &&
              Date.now() >= classStartTime - classCancellationCutoffMs;
            const basicBlocked = planSlug === 'basic' && !isBooked;
            const awaitingRenewal =
              planSlug === 'standard' &&
              !isBooked &&
              (!hasBookingPeriod ||
                classItem.classDate < bookingPeriod.startDate ||
                classItem.classDate >= bookingPeriod.endDate);
            const standardBlocked =
              planSlug === 'standard' &&
              !isBooked &&
              (standardBookingsUsed >= 3 || awaitingRenewal);
            const color = classItem.color || 'gray';

            return (
              <article
                className={`relative min-h-44.5 w-full overflow-hidden rounded-[30px] border border-[#414141] bg-[#252525] px-5 pb-3 pt-6 shadow-[0_24px_70px_rgba(0,0,0,0.38)] before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:content-["_"] sm:w-70 xl:w-75 ${accentClasses[color] || accentClasses.gray}`}
                key={classItem.id}
              >
                <div className='flex items-start justify-between gap-3'>
                  <h2
                    className={`m-0 min-w-0 whitespace-nowrap font-black leading-tight ${getClassTitleSize(classItem.name)}`}
                  >
                    {classItem.name.replace('®', '')}
                  </h2>
                  <span
                    className={`flex-none rounded-full px-3 py-2 text-[9px] font-black ${badgeClasses[color] || badgeClasses.gray}`}
                  >
                    {classItem.category || 'CLASS'}
                  </span>
                </div>
                <p className='mb-0 mt-2 text-xs text-[#bdbdbd]'>
                  {classItem.duration.replace('min', ' min')}
                </p>
                <time className='mt-4 block text-base font-black'>
                  {formatClassTime(classItem.time)}
                </time>

                <strong className='mt-3 block text-xs'>
                  {classItem.trainerName}
                </strong>
                <div className='mt-3 grid grid-cols-[86px_minmax(0,1fr)] items-end gap-2.5 max-[680px]:grid-cols-1'>
                  <span
                    className={`min-w-19.5 justify-self-start rounded-full px-3 py-2 text-center text-[10px] font-black ${isFull ? 'bg-[#e6002e] text-white' : 'bg-[#30ff00] text-[#101010]'}`}
                  >
                    {isBooked
                      ? 'Booked'
                      : isFull
                        ? 'Full'
                        : `${classItem.availableSpots} spots`}
                  </span>
                  <button
                    className='min-h-8 rounded-full border-0 bg-[#e6002e] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-70'
                    disabled={
                      (isFull && !isBooked) ||
                      basicBlocked ||
                      standardBlocked ||
                      classStarted ||
                      cancellationClosed ||
                      savingClassId === classItem.id
                    }
                    onClick={() => handleBooking(classItem)}
                    type='button'
                  >
                    {savingClassId === classItem.id
                      ? 'Saving...'
                      : isBooked
                        ? cancellationClosed
                          ? 'Cancellation closed'
                          : 'Cancel booking'
                        : classStarted
                          ? 'Class started'
                        : awaitingRenewal
                          ? 'Available after renewal'
                        : basicBlocked
                          ? 'Not included'
                          : standardBlocked
                            ? 'Limit reached'
                            : 'Book Class'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {message && (
        <p
          className='fixed right-4 top-4 z-50 m-0 w-[calc(100%-32px)] max-w-sm rounded-[18px] border border-[#555] bg-[#252525] px-5 py-4 text-sm font-black text-white shadow-[0_20px_60px_rgba(0,0,0,0.55)] sm:right-6 sm:top-6'
          role='status'
          aria-live='polite'
        >
          {message}
        </p>
      )}
    </section>
  );
}
