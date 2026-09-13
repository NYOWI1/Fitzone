import { useEffect, useState } from 'react';
import { getMemberProgress } from '../../../../shared/api';

const emptyProgress = {
  summary: {
    workoutStreak: 0,
    visitsThisMonth: 0,
    activeDaysThisMonth: 0,
    classesBookedThisMonth: 0,
    trainerSessionsThisMonth: 0
  },
  attendanceHistory: [],
  recentAttendance: []
};

const monthOptions = Array.from({ length: 12 }, (_, value) => ({
  label: new Date(2026, value, 1).toLocaleString('en-US', { month: 'long' }),
  value
}));
const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDateParts(value) {
  const [year, month, day] = String(value || '')
    .slice(0, 10)
    .split('-')
    .map(Number);

  return year && month && day ? { year, month: month - 1, day } : null;
}

function getAttendanceCalendarDays(history, selectedMonth, selectedYear) {
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstWeekday = new Date(selectedYear, selectedMonth, 1).getDay();
  const visitsByDay = new Map();

  history.forEach((record) => {
    const date = getDateParts(record.attendanceDate);

    if (date?.year === selectedYear && date.month === selectedMonth) {
      visitsByDay.set(
        date.day,
        (visitsByDay.get(date.day) || 0) + Number(record.visits || 0)
      );
    }
  });

  return [
    ...Array.from({ length: firstWeekday }, (_, index) => ({
      id: `empty-${index}`,
      isEmpty: true
    })),
    ...Array.from({ length: daysInMonth }, (_, index) => ({
      id: `day-${index + 1}`,
      day: index + 1,
      isEmpty: false,
      visits: visitsByDay.get(index + 1) || 0
    }))
  ];
}

export default function ProgressPage({ user = null }) {
  const today = new Date();
  const [progress, setProgress] = useState(emptyProgress);
  const [status, setStatus] = useState('loading');
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const memberEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    '';
  const memberId = user?.id || '';
  const summary = progress.summary || emptyProgress.summary;
  const attendanceHistory = progress.attendanceHistory || [];
  const yearOptions = Array.from(
    new Set([
      today.getFullYear(),
      ...attendanceHistory
        .map((record) => getDateParts(record.attendanceDate)?.year)
        .filter(Boolean)
    ])
  ).sort((left, right) => right - left);
  const calendarDays = getAttendanceCalendarDays(
    attendanceHistory,
    selectedMonth,
    selectedYear
  );
  const selectedMonthVisits = calendarDays.reduce(
    (total, calendarDay) => total + Number(calendarDay.visits || 0),
    0
  );
  const totalAttendanceVisits = attendanceHistory.reduce(
    (total, record) => total + Number(record.visits || 0),
    0
  );
  const selectedYearVisits = attendanceHistory.reduce((total, record) => {
    const date = getDateParts(record.attendanceDate);
    return date?.year === selectedYear
      ? total + Number(record.visits || 0)
      : total;
  }, 0);
  const totalBookedSessions =
    Number(summary.classesBookedThisMonth || 0) +
    Number(summary.trainerSessionsThisMonth || 0);
  const statCards = [
    {
      label: 'Workout Streak',
      value: `${summary.workoutStreak || 0} days`
    },
    {
      label: 'Visits This Month',
      value: summary.visitsThisMonth || 0
    },
    {
      label: 'Active Days',
      value: summary.activeDaysThisMonth || 0
    },
    {
      label: 'Booked Sessions',
      value: totalBookedSessions
    }
  ];

  useEffect(() => {
    let isCurrent = true;

    async function loadProgress() {
      if (!memberEmail || !memberId) {
        setStatus('error');
        return;
      }

      try {
        const nextProgress = await getMemberProgress(memberEmail, memberId);

        if (isCurrent) {
          setProgress(nextProgress);
          setStatus('ready');
        }
      } catch (error) {
        console.error(error);
        if (isCurrent) setStatus('error');
      }
    }

    loadProgress();
    return () => {
      isCurrent = false;
    };
  }, [memberEmail, memberId]);

  return (
    <section className='min-w-0 pb-6'>
      <header>
        <h1 className='m-0 mb-2 text-3xl font-black leading-none sm:text-[38px]'>
          Progress
        </h1>
        <p className='m-0 text-sm text-[#bdbdbd] sm:text-base'>
          Track workout consistency, gym visits, classes, and coaching sessions.
        </p>
      </header>

      {status === 'loading' && (
        <p className='mt-7 rounded-[24px] border border-[#414141] bg-[#252525] px-5 py-6 font-bold'>
          Loading your progress...
        </p>
      )}
      {status === 'error' && (
        <p className='mt-7 rounded-[24px] border border-[#414141] bg-[#252525] px-5 py-6 font-bold text-[#ff8ea2]'>
          Progress data is temporarily unavailable.
        </p>
      )}

      {status === 'ready' && (
        <>
          <div className='mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-4'>
            {statCards.map((stat) => (
              <article
                className='min-h-28 rounded-[24px] border border-[#414141] bg-[#252525] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)]'
                key={stat.label}
              >
                <strong className='block break-words text-2xl font-black text-[#e6002e] sm:text-[28px]'>
                  {stat.value}
                </strong>
                <span className='mt-3 block text-sm font-black'>
                  {stat.label}
                </span>
              </article>
            ))}
          </div>

          <article className='mt-7 overflow-hidden rounded-[28px] border border-[#414141] bg-[#252525] shadow-[0_24px_65px_rgba(0,0,0,0.32)]'>
            <div className='flex flex-col gap-4 border-b border-[#414141] px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between'>
              <div>
                <h2 className='m-0 text-xl font-black sm:text-2xl'>
                  Monthly Attendance
                </h2>
                <p className='mb-0 mt-2 text-sm text-[#bdbdbd]'>
                  {totalAttendanceVisits} recorded check-in
                  {totalAttendanceVisits === 1 ? '' : 's'} for your account
                </p>
              </div>
              <span className='w-fit rounded-[14px] border border-[rgba(48,230,0,0.3)] bg-[rgba(48,230,0,0.1)] px-4 py-2 text-sm font-black text-[#30e600]'>
                Your attendance
              </span>
            </div>

            <div className='p-4 sm:p-6'>
              <span className='mb-5 inline-flex items-center gap-2 rounded-full border border-[#414141] bg-[#202020] px-3 py-2 text-xs font-black'>
                <span className='h-2.5 w-2.5 rounded-full bg-[#30e600]'></span>
                {selectedYear}
                <small className='text-[11px] text-[#bdbdbd]'>
                  {selectedYearVisits} check-in
                  {selectedYearVisits === 1 ? '' : 's'}
                </small>
              </span>
              <div className='mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <h3 className='m-0 text-lg font-black'>Daily Check-ins</h3>
                  <p className='mb-0 mt-1 text-xs font-bold text-[#bdbdbd]'>
                    Your recorded attendance for each day.
                  </p>
                </div>
                <div className='flex gap-2'>
                  <select
                    className='min-h-11 min-w-0 flex-1 rounded-[12px] border border-[#414141] bg-[#2c2c2c] px-3 text-sm font-bold text-white outline-none focus:border-[#30e600] sm:flex-none'
                    onChange={(event) =>
                      setSelectedMonth(Number(event.target.value))
                    }
                    value={selectedMonth}
                  >
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                  <select
                    className='min-h-11 min-w-0 flex-1 rounded-[12px] border border-[#414141] bg-[#2c2c2c] px-3 text-sm font-bold text-white outline-none focus:border-[#30e600] sm:flex-none'
                    onChange={(event) =>
                      setSelectedYear(Number(event.target.value))
                    }
                    value={selectedYear}
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className='max-w-full overflow-x-auto pb-2'>
                <div className='min-w-155'>
                  <div className='grid grid-cols-7 gap-2 text-center text-[11px] font-black uppercase text-[#bdbdbd]'>
                    {weekdayLabels.map((weekday) => (
                      <span key={weekday}>{weekday}</span>
                    ))}
                  </div>
                  <div className='mt-2 grid grid-cols-7 gap-2'>
                    {calendarDays.map((calendarDay) =>
                      calendarDay.isEmpty ? (
                        <div className='min-h-18' key={calendarDay.id}></div>
                      ) : (
                        <div
                          className={
                            calendarDay.visits
                              ? 'min-h-18 rounded-[14px] border border-[rgba(48,230,0,0.34)] bg-[rgba(48,230,0,0.08)] p-2.5 text-left text-white'
                              : 'min-h-18 rounded-[14px] border border-[#363636] bg-[#202020] p-2.5 text-left text-white'
                          }
                          key={calendarDay.id}
                        >
                          <span className='flex items-start justify-between gap-2'>
                            <strong className='text-sm'>
                              {calendarDay.day}
                            </strong>
                            {calendarDay.visits > 0 && (
                              <span className='rounded-full bg-[#30e600] px-2 py-1 text-[10px] font-black text-[#111]'>
                                {calendarDay.visits}
                              </span>
                            )}
                          </span>
                          <span className='mt-3 block text-[11px] font-bold text-[#bdbdbd]'>
                            {calendarDay.visits
                              ? `${calendarDay.visits} check-in${calendarDay.visits === 1 ? '' : 's'}`
                              : 'No check-ins'}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </article>

          <div className='mt-6'>
            <article className='rounded-[28px] border border-[#414141] bg-[#252525] p-5 shadow-[0_24px_65px_rgba(0,0,0,0.28)] sm:p-6'>
              <h2 className='m-0 text-xl font-black'>Monthly Sessions</h2>
              <div className='mt-5 grid gap-3'>
                <div className='flex min-h-14 items-center justify-between rounded-[16px] border border-[#414141] bg-[#2c2c2c] px-4'>
                  <span className='text-sm text-[#bdbdbd]'>Classes booked</span>
                  <strong className='text-[#e6002e]'>
                    {summary.classesBookedThisMonth || 0}
                  </strong>
                </div>
                <div className='flex min-h-14 items-center justify-between rounded-[16px] border border-[#414141] bg-[#2c2c2c] px-4'>
                  <span className='text-sm text-[#bdbdbd]'>
                    Trainer sessions
                  </span>
                  <strong className='text-[#e6002e]'>
                    {summary.trainerSessionsThisMonth || 0}
                  </strong>
                </div>
              </div>
            </article>
          </div>
        </>
      )}
    </section>
  );
}
