import { useEffect, useMemo, useState } from 'react';
import {
  getClassBookings,
  getCrowdStatus,
  getMemberProgress,
  getTrainerBookings
} from '../../../../shared/api';

const emptyProgress = {
  summary: {
    visitsThisMonth: 0,
    activeDaysThisMonth: 0,
    classesBookedThisMonth: 0,
    trainerSessionsThisMonth: 0
  },
  attendanceHistory: []
};
const emptyCrowdStatus = {
  active: false,
  peopleCount: 0,
  capacity: 70,
  capacityPercent: 0,
  label: 'Offline',
  tone: 'yellow'
};
const crowdToneStyles = {
  green: {
    badge: 'border-[#24651f] bg-[#182d18] text-[#30e600]',
    bar: 'bg-[#30e600]',
    dot: 'bg-[#30e600]'
  },
  yellow: {
    badge: 'border-[#665a24] bg-[#302b1b] text-[#ffd54f]',
    bar: 'bg-[#ffd54f]',
    dot: 'bg-[#ffd54f]'
  },
  red: {
    badge: 'border-[#702437] bg-[#321c22] text-[#ff5577]',
    bar: 'bg-[#e6002e]',
    dot: 'bg-[#e6002e]'
  }
};

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(new Date(`${value}T00:00:00`));
}

function formatSessionTime(value) {
  if (!value) return '';
  if (value.includes('AM') || value.includes('PM')) return value;

  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(2000, 0, 1, hours, minutes));
}

function getPlanSessionLimit(membershipAccess) {
  const plan = String(
    membershipAccess?.planSlug || membershipAccess?.planName || ''
  ).toLowerCase();

  if (plan.includes('premium')) return 4;
  if (plan.includes('standard')) return 2;
  return 0;
}

function getMembershipPeriod(membershipAccess) {
  const start = membershipAccess?.currentPeriodStart
    ? formatIsoDate(new Date(membershipAccess.currentPeriodStart * 1000))
    : membershipAccess?.currentPeriodStartDate || '';
  const end = membershipAccess?.currentPeriodEnd
    ? formatIsoDate(new Date(membershipAccess.currentPeriodEnd * 1000))
    : membershipAccess?.currentPeriodEndDate || '';

  return { start, end };
}

function getBookingTimestamp(dateValue, timeValue, useEndTime = false) {
  const [year, month, day] = String(dateValue || '')
    .slice(0, 10)
    .split('-')
    .map(Number);
  const timeParts = String(timeValue || '').split(/\s*-\s*/);
  const clockValue = useEndTime
    ? timeParts[timeParts.length - 1]
    : timeParts[0];
  const match = clockValue.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);

  if (!year || !month || !day || !match) return Number.NaN;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const period = String(match[3] || '').toUpperCase();

  if (period === 'AM' && hours === 12) hours = 0;
  if (period === 'PM' && hours < 12) hours += 12;

  return new Date(year, month - 1, day, hours, minutes).getTime();
}

function getUpcomingBooking(
  bookings,
  dateKey,
  timeKey,
  { availableUntilEnd = false } = {}
) {
  const now = Date.now();

  return bookings
    .map((booking) => ({
      booking,
      startAt: getBookingTimestamp(booking[dateKey], booking[timeKey]),
      availableUntil: getBookingTimestamp(
        booking[dateKey],
        booking[timeKey],
        availableUntilEnd
      )
    }))
    .filter(
      ({ availableUntil, startAt }) =>
        Number.isFinite(startAt) &&
        Number.isFinite(availableUntil) &&
        availableUntil > now
    )
    .sort((left, right) => left.startAt - right.startAt)[0]?.booking;
}

function getWeekActivity(attendanceHistory) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(today.getDate() - today.getDay() + 1);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const isoDate = formatIsoDate(date);
    const visits = attendanceHistory.reduce(
      (total, record) =>
        String(record.attendanceDate || '').slice(0, 10) === isoDate
          ? total + Number(record.visits || 0)
          : total,
      0
    );

    return {
      isToday: isoDate === formatIsoDate(today),
      label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][index],
      visits
    };
  });
}

function StatCard({ color, label, value }) {
  return (
    <article className='grid min-h-24 grid-cols-1 place-items-center gap-2 rounded-[18px] border border-[#414141] bg-[#252525] p-3 text-center shadow-[0_20px_50px_rgba(0,0,0,0.26)] sm:min-h-28 sm:grid-cols-[52px_minmax(0,1fr)] sm:place-items-stretch sm:items-center sm:gap-4 sm:rounded-[24px] sm:p-5 sm:text-left'>
      <span
        className='grid h-10 w-10 place-items-center rounded-full text-lg font-black sm:h-13 sm:w-13 sm:text-2xl'
        style={{ backgroundColor: `${color}24`, color }}
      >
        {value}
      </span>
      <div className='min-w-0'>
        <strong className='block text-[11px] leading-tight sm:text-sm'>{label}</strong>
        <small className='mt-1 hidden text-xs text-[#a9a9a9] sm:block'>This month</small>
      </div>
    </article>
  );
}

export default function DashboardPage({
  user = null,
  membershipAccess = null
}) {
  const [progress, setProgress] = useState(emptyProgress);
  const [classBookings, setClassBookings] = useState([]);
  const [trainerBookings, setTrainerBookings] = useState([]);
  const [crowdData, setCrowdData] = useState(emptyCrowdStatus);
  const [status, setStatus] = useState('loading');
  const memberEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    '';
  const memberId = user?.id || '';
  const firstName =
    user?.firstName || user?.fullName?.split(' ')[0] || 'Member';
  const summary = progress.summary || emptyProgress.summary;
  const nextClass = useMemo(
    () =>
      getUpcomingBooking(classBookings, 'classDate', 'classTime', {
        availableUntilEnd: true
      }),
    [classBookings]
  );
  const nextTrainerSession = useMemo(
    () => getUpcomingBooking(trainerBookings, 'sessionDate', 'sessionTime'),
    [trainerBookings]
  );
  const weekActivity = useMemo(
    () => getWeekActivity(progress.attendanceHistory || []),
    [progress.attendanceHistory]
  );
  const weeklyVisits = weekActivity.reduce(
    (total, day) => total + day.visits,
    0
  );
  const highestDailyVisits = Math.max(
    1,
    ...weekActivity.map((day) => day.visits)
  );
  const crowdTone = crowdToneStyles[crowdData.tone] || crowdToneStyles.yellow;
  const sessionLimit = getPlanSessionLimit(membershipAccess);
  const { start: periodStart, end: periodEnd } =
    getMembershipPeriod(membershipAccess);
  const usedTrainerSessions = trainerBookings.filter(
    (booking) =>
      (!periodStart || booking.sessionDate >= periodStart) &&
      (!periodEnd || booking.sessionDate < periodEnd)
  ).length;
  const sessionsLeft = Math.max(sessionLimit - usedTrainerSessions, 0);

  useEffect(() => {
    let isCurrent = true;

    async function loadDashboard() {
      if (!memberEmail || !memberId) {
        setStatus('error');
        return;
      }

      try {
        const [nextProgress, nextClassBookings, nextTrainerBookings] =
          await Promise.all([
            getMemberProgress(memberEmail, memberId),
            getClassBookings(memberEmail),
            getTrainerBookings(memberEmail)
          ]);

        if (isCurrent) {
          setProgress(nextProgress);
          setClassBookings(nextClassBookings);
          setTrainerBookings(nextTrainerBookings);
          setStatus('ready');
        }
      } catch (error) {
        console.error(error);
        if (isCurrent) setStatus('error');
      }
    }

    loadDashboard();
    return () => {
      isCurrent = false;
    };
  }, [memberEmail, memberId]);

  useEffect(() => {
    let isCurrent = true;

    async function loadCrowdStatus() {
      try {
        const nextStatus = await getCrowdStatus();
        if (isCurrent) setCrowdData(nextStatus);
      } catch (error) {
        console.warn('Live crowd status is unavailable.', error);
        if (isCurrent) setCrowdData(emptyCrowdStatus);
      }
    }

    loadCrowdStatus();
    const intervalId = window.setInterval(loadCrowdStatus, 3000);

    return () => {
      isCurrent = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <section className='min-w-0 pb-6'>
      <header>
        <h1 className='m-0 mb-2 break-words text-2xl font-black leading-tight sm:text-[38px] sm:leading-none'>
          Welcome back, {firstName}
        </h1>
        <p className='m-0 text-sm text-[#bdbdbd] sm:text-base'>
          Here is your activity and upcoming fitness schedule.
        </p>
      </header>

      {status === 'loading' && (
        <p className='mt-7 rounded-[24px] border border-[#414141] bg-[#252525] px-5 py-6 font-bold'>
          Loading your dashboard...
        </p>
      )}

      {status === 'error' && (
        <p className='mt-7 rounded-[24px] border border-[#6d2633] bg-[#2d2023] px-5 py-6 font-bold text-[#ff8ea2]'>
          Your dashboard data is temporarily unavailable. Please refresh
          shortly.
        </p>
      )}

      {status === 'ready' && (
        <>
          <div className='mt-5 grid grid-cols-3 gap-2 sm:mt-7 sm:gap-5'>
            <StatCard
              color='#e6002e'
              label='Classes Booked'
              value={summary.classesBookedThisMonth || 0}
            />
            <StatCard
              color='#30e600'
              label='Active Days'
              value={summary.activeDaysThisMonth || 0}
            />
            <StatCard
              color='#4da3ff'
              label='Gym Visits'
              value={summary.visitsThisMonth || 0}
            />
          </div>

          <div className='mt-5 grid grid-cols-1 gap-4 sm:mt-6 sm:gap-6 2xl:grid-cols-2'>
            <article className='relative overflow-hidden rounded-[22px] border border-[#414141] bg-[#252525] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.3)] before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-[#e6002e] sm:rounded-[28px] sm:p-6'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                  <h2 className='m-0 text-xl font-black sm:text-2xl'>PT Booking</h2>
                  <p className='mb-0 mt-1 text-sm text-[#bdbdbd]'>
                    Your personal training schedule
                  </p>
                </div>
                <span className='rounded-full border border-[#e6002e] px-4 py-2 text-xs font-black text-[#ff5577]'>
                  {sessionLimit === 0
                    ? 'NOT INCLUDED'
                    : `${sessionsLeft} PT LEFT`}
                </span>
              </div>

              <div className='mt-5 rounded-[20px] border border-[#414141] bg-[#2d2d2d] p-4'>
                {nextTrainerSession ? (
                  <>
                    <strong className='block break-words text-lg'>
                      {nextTrainerSession.trainerName}
                    </strong>
                    <p className='mb-0 mt-1 text-sm text-[#bdbdbd]'>
                      {formatDate(nextTrainerSession.sessionDate)} at{' '}
                      {formatSessionTime(nextTrainerSession.sessionTime)}
                    </p>
                  </>
                ) : (
                  <>
                    <strong className='block text-lg'>
                      No session scheduled
                    </strong>
                    <p className='mb-0 mt-1 text-sm text-[#bdbdbd]'>
                      Choose a coach and reserve an available time.
                    </p>
                  </>
                )}
              </div>

              <a
                className='mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#e6002e] px-5 text-sm font-black text-white no-underline transition hover:bg-[#ff1647] sm:w-auto sm:min-w-44'
                href='#Trainers'
              >
                {nextTrainerSession ? 'View trainers' : 'Book PT session'}
              </a>
            </article>

            <article className='relative overflow-hidden rounded-[22px] border border-[#414141] bg-[#252525] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.3)] before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-[#ffd54f] sm:rounded-[28px] sm:p-6'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                  <h2 className='m-0 text-xl font-black sm:text-2xl'>Crowd Detection</h2>
                  <p className='mb-0 mt-1 text-sm text-[#bdbdbd]'>
                    Live gym capacity status before you go
                  </p>
                </div>
                <span
                  className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-4 text-xs font-black uppercase ${crowdTone.badge}`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${crowdTone.dot}`}
                  ></span>
                  {crowdData.active ? crowdData.label : 'Offline'}
                </span>
              </div>

              {crowdData.active ? (
                <div className='mt-6 grid min-h-32 grid-cols-1 gap-5 rounded-[20px] border border-[#414141] bg-[#202020] p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center'>
                  <div>
                    <strong className='block whitespace-nowrap text-3xl font-black'>
                      {crowdData.peopleCount}
                      <span className='text-xl text-[#8f8f8f]'>
                        /{crowdData.capacity}
                      </span>
                    </strong>
                    <span className='mt-1 block text-xs font-bold text-[#bdbdbd]'>
                      people detected
                    </span>
                  </div>
                  <div className='min-w-0'>
                    <div className='h-3 w-full overflow-hidden rounded-full bg-[#353535]'>
                      <span
                        className={`block h-full rounded-full transition-[width] duration-500 ${crowdTone.bar}`}
                        style={{ width: `${crowdData.capacityPercent}%` }}
                      ></span>
                    </div>
                    <strong className='mt-3 block text-sm'>
                      {crowdData.capacityPercent}% capacity
                    </strong>
                  </div>
                </div>
              ) : (
                <div className='mt-6 flex min-h-32 flex-col justify-center rounded-[20px] border border-[#554d29] bg-[#2c291f] p-5'>
                  <strong className='text-lg text-[#ffd54f]'>
                    Awaiting live update
                  </strong>
                  <p className='mb-0 mt-3 max-w-120 text-sm leading-relaxed text-[#c9c3aa]'>
                    Keep the admin panel and crowd camera active to publish live
                    capacity.
                  </p>
                </div>
              )}
            </article>
          </div>

          <div className='mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'>
            <article className='relative overflow-hidden rounded-[22px] border border-[#414141] bg-[#252525] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.3)] before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-[#e6002e] sm:rounded-[28px] sm:p-6'>
              <h2 className='m-0 text-xl font-black'>Next Class</h2>
              {nextClass ? (
                <>
                  <p className='mb-0 mt-4 text-sm font-black text-[#e6002e]'>
                    {formatDate(nextClass.classDate)} · {nextClass.classTime}
                  </p>
                  <strong className='mt-4 block break-words text-2xl'>
                    {nextClass.className}
                  </strong>
                  <p className='mb-0 mt-2 text-sm text-[#bdbdbd]'>
                    {[nextClass.duration, nextClass.trainerName]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </>
              ) : (
                <>
                  <strong className='mt-5 block text-xl'>
                    No class booked
                  </strong>
                  <p className='mb-0 mt-2 text-sm text-[#bdbdbd]'>
                    Browse the schedule and reserve your next class.
                  </p>
                </>
              )}
              <a
                className='mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#e6002e] px-5 text-sm font-black text-white no-underline transition hover:bg-[#ff1647] sm:w-auto sm:min-w-32'
                href='#Classes'
              >
                {nextClass ? 'View class' : 'Browse classes'}
              </a>
            </article>

            <article className='rounded-[22px] border border-[#414141] bg-[#252525] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.3)] sm:rounded-[28px] sm:p-6'>
              <div className='flex flex-wrap items-end justify-between gap-3'>
                <div>
                  <h2 className='m-0 text-xl font-black'>Weekly Activity</h2>
                  <p className='mb-0 mt-1 text-sm text-[#bdbdbd]'>
                    {weeklyVisits} gym {weeklyVisits === 1 ? 'visit' : 'visits'}{' '}
                    this week
                  </p>
                </div>
                <a
                  className='text-sm font-black text-[#30e600] no-underline'
                  href='#Progress'
                >
                  View attendance
                </a>
              </div>
              <div className='mt-5 grid grid-cols-7 gap-1.5 sm:mt-6 sm:gap-4'>
                {weekActivity.map((day, index) => (
                  <div
                    className='flex min-w-0 flex-col items-center text-center'
                    key={`${day.label}-${index}`}
                  >
                    <strong className='mb-2 text-xs text-white'>
                      {day.visits}
                    </strong>
                    <div className='flex h-20 w-full max-w-10 items-end overflow-hidden rounded-lg bg-[#303030] sm:h-24 sm:rounded-xl'>
                      <span
                        className={`w-full rounded-xl transition-[height] duration-500 ${day.isToday ? 'bg-[#e6002e]' : 'bg-[#30e600]'}`}
                        style={{
                          height: day.visits
                            ? `${Math.max(24, (day.visits / highestDailyVisits) * 100)}%`
                            : '0%'
                        }}
                      ></span>
                    </div>
                    <small className='mt-2 block text-xs font-bold text-[#bdbdbd]'>
                      {day.label}
                    </small>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </>
      )}
    </section>
  );
}
