import { useEffect, useState } from 'react';
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-react';
import {
  getClassBookingCounts,
  getClassBookings,
  getClassSchedule,
  getStripePaymentAccess,
  getTrainers,
  toggleClassBooking
} from '../../shared/api';
import {
  getSavedPaidMembershipAccess,
  savePaidMembershipAccess
} from '../membership-flow/shared/planSelection';

const navItems = [
  'Dashboard',
  'Classes',
  'My Plan',
  'Trainers',
  'Progress',
  'Payments',
  'Settings'
];

const classFilters = ['All', 'Strength', 'HIIT', 'Yoga', 'Cycling', 'Combat'];
const categoryFilters = {
  All: null,
  Strength: 'STR',
  HIIT: 'HIIT',
  Yoga: 'YOGA',
  Cycling: 'BIKE',
  Combat: 'CORE'
};
const categoryLabels = {
  BIKE: 'BIKE',
  CORE: 'CORE',
  HIIT: 'HIIT',
  STR: 'STR',
  YOGA: 'YOGA'
};
const defaultClassCapacity = 10;
const classAccentClasses = {
  gray: 'before:bg-[#b8b8b8]',
  green: 'before:bg-[#30ff00]',
  red: 'before:bg-[#e6002e]',
  teal: 'before:bg-[#05735e]',
  yellow: 'before:bg-[#ffd54f]'
};
const classBadgeClasses = {
  gray: 'bg-[#b8b8b8] text-white',
  green: 'bg-[#30ff00] text-[#101010]',
  red: 'bg-[#e6002e] text-white',
  teal: 'bg-[#05735e] text-white',
  yellow: 'bg-[#ffd54f] text-[#101010]'
};
const dashboardShellClass =
  'relative grid min-h-screen grid-cols-1 overflow-x-hidden bg-[#0d0d0d] p-4 font-[Inter,Arial,sans-serif] text-white md:p-6 xl:h-screen xl:grid-cols-[238px_minmax(0,1fr)] xl:overflow-hidden xl:p-8';
const sidebarClass =
  'relative z-1 flex min-h-[calc(100vh_-_64px)] flex-col rounded-[34px] border border-[#414141] bg-[#181818] px-4.75 py-6.75 shadow-[0_24px_70px_rgba(0,0,0,0.32)] max-[1120px]:min-h-0 max-[680px]:rounded-[28px] xl:h-[calc(100vh_-_64px)] xl:min-h-0 xl:overflow-hidden';
const brandClass = 'flex items-center gap-3.5 px-2 text-white no-underline';
const logoClass =
  'grid h-11.75 w-11.75 flex-none place-items-center rounded-[18px] bg-[#e6002e] text-2xl font-black shadow-[0_14px_28px_rgba(230,0,46,0.24)]';
const navClass =
  'mt-11.75 grid gap-2.5 max-[1120px]:grid-cols-4 max-[680px]:grid-cols-2';
const navItemClass =
  'flex min-h-11 items-center gap-3.5 rounded-full border border-transparent px-4 text-sm font-black text-[#a7a7a7] no-underline transition hover:bg-[#252525] hover:text-white';
const navItemActiveClass =
  'border-[#e6002e] bg-[rgba(230,0,46,0.1)] text-white shadow-[0_12px_28px_rgba(230,0,46,0.12)]';
const navDotClass = 'h-2.5 w-2.5 rounded-full bg-[#454545]';
const navDotActiveClass = 'bg-[#e6002e]';
const profileCardClass =
  'mt-auto flex min-h-21 items-center gap-3.5 rounded-[24px] border border-[#414141] bg-[#252525] p-3.5 shadow-[0_16px_34px_rgba(0,0,0,0.24)] max-[1120px]:mt-7';
const profileInitialClass =
  'grid h-11.5 w-11.5 flex-none place-items-center rounded-[18px] bg-[#e6002e] text-[21px] font-black';
const mainContentClass =
  'relative z-1 min-w-0 pt-5 pl-8.5 max-[1120px]:pt-7 max-[1120px]:pl-0 xl:h-[calc(100vh_-_64px)] xl:overflow-y-auto xl:pr-1';
const authShellClass =
  'relative grid min-h-screen place-items-center bg-[#0d0d0d] p-8 font-[Inter,Arial,sans-serif] text-white max-[680px]:p-4';
const authCardClass =
  'rounded-5.5 border border-[#414141] bg-[#252525] p-8 text-center';
const authLinkClass =
  'inline-flex min-h-10.5 min-w-37.5 items-center justify-center rounded-xl bg-[#e6002e] px-5 text-[13px] font-black text-white no-underline';
const authWarningClass =
  'mb-4 rounded-3.5 border border-[rgba(255,213,79,0.28)] bg-[rgba(255,213,79,0.1)] px-3.5 py-3 text-[13px] leading-[1.4] text-[#ffd54f]';

function getDashboardPageFromHash() {
  const rawPage = window.location.hash.replace('#', '');
  const page = decodeURIComponent(rawPage);
  return navItems.includes(page) ? page : 'Dashboard';
}

function getWeekDays() {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  return Array.from({ length: 6 }, (_, offset) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + offset + 1);
    const isToday = date.toDateString() === today.toDateString();

    return {
      day: date.getDay(),
      date: date.getDate(),
      label: isToday
        ? 'Today'
        : new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)
    };
  });
}

function formatClassTime(time) {
  return time
    .replaceAll('am', ' AM')
    .replaceAll('pm', ' PM')
    .replaceAll(' - ', ' - ')
    .toUpperCase();
}

function getTrainerName(trainers, trainerIndex, fallbackIndex) {
  const trainer = trainers[trainerIndex ?? fallbackIndex];

  if (!trainer?.name) {
    return `Coach ${fallbackIndex + 1}`;
  }

  return `Coach ${trainer.name.split(' ')[0]}`;
}

function getClassesForDay(schedule, activeDay, trainers, bookingCounts = {}) {
  const daySchedule = schedule.find((item) => item.weekday === activeDay);

  if (!daySchedule) {
    return [];
  }

  return [...(daySchedule.morning || []), ...(daySchedule.evening || [])].map(
    (classItem, index) => {
      const classId = `${activeDay}-${classItem.name}-${classItem.time}-${index}`;
      const capacity = Number(classItem.capacity) || defaultClassCapacity;
      const bookedCount = Number(bookingCounts[classId] || 0);

      return {
        ...classItem,
        availableSpots: Math.max(capacity - bookedCount, 0),
        bookedCount,
        capacity,
        id: classId,
        trainerName: getTrainerName(trainers, classItem.trainerIndex, index)
      };
    }
  );
}

function DashboardLayout({ activePage, children, user = null }) {
  const fullName = user?.fullName || 'Member';

  return (
    <main className={dashboardShellClass}>
      <div className='pointer-events-none absolute -left-40 -top-27.5 h-125 w-125 rounded-full bg-[rgba(230,0,46,0.14)]'></div>
      <div className='pointer-events-none absolute -bottom-47.5 -right-30 h-107.5 w-107.5 rounded-full bg-[rgba(48,255,0,0.08)]'></div>

      <aside className={sidebarClass}>
        <a className={brandClass} href='/'>
          <span className={logoClass}>F</span>
          <div>
            <strong className='block text-[25px] leading-none'>FITZONE</strong>
            <small className='mt-1.25 block text-[10px] font-black text-[#e6002e]'>
              MEMBER APP
            </small>
          </div>
        </a>

        <nav className={navClass} aria-label='Member dashboard'>
          {navItems.map((item) => (
            <a
              className={
                item === activePage
                  ? `${navItemClass} ${navItemActiveClass}`
                  : navItemClass
              }
              href={`#${encodeURIComponent(item)}`}
              key={item}
            >
              <span
                className={
                  item === activePage
                    ? `${navDotClass} ${navDotActiveClass}`
                    : navDotClass
                }
              ></span>
              {item}
            </a>
          ))}
        </nav>

        <div className={profileCardClass}>
          <span className={profileInitialClass}>
            {fullName.charAt(0).toUpperCase()}
          </span>
          <div>
            <strong className='block text-sm'>{fullName}</strong>
            <small className='mt-1.25 block text-xs text-[#bdbdbd]'>
              Member
            </small>
          </div>
        </div>
      </aside>

      <section className={mainContentClass}>{children}</section>
    </main>
  );
}

function DashboardPlaceholder() {
  return (
    <section className='relative z-1 grid min-h-45 max-w-180 gap-9 rounded-5.5 border border-[#414141] bg-[#252525] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.38)]'>
      <h1 className='m-0 text-2xl leading-none'>User Dashboard</h1>
      <p className='m-0 text-sm leading-normal text-[#bdbdbd]'>
        This member section is ready for its live controls and will keep the
        same responsive layout as the rest of the panel.
      </p>
    </section>
  );
}

function MemberClassesPage({ user = null }) {
  const [schedule, setSchedule] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [status, setStatus] = useState('loading');
  const [bookingStatus, setBookingStatus] = useState('idle');
  const [bookingMessage, setBookingMessage] = useState('');
  const [activeDay, setActiveDay] = useState(() => new Date().getDay());
  const [activeFilter, setActiveFilter] = useState('All');
  const [bookedClassIds, setBookedClassIds] = useState(() => new Set());
  const [bookingCounts, setBookingCounts] = useState({});
  const memberEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    '';
  const memberName = user?.fullName || 'Member';
  const weekDays = getWeekDays();
  const classes = getClassesForDay(
    schedule,
    activeDay,
    trainers,
    bookingCounts
  );
  const classesToday = getClassesForDay(
    schedule,
    new Date().getDay(),
    trainers,
    bookingCounts
  ).length;
  const visibleClasses = classes.filter((classItem) => {
    const category = categoryFilters[activeFilter];
    return !category || classItem.category === category;
  });
  const bookedThisWeek = bookedClassIds.size;

  useEffect(() => {
    let isCurrent = true;

    async function loadClasses() {
      try {
        const [nextSchedule, nextTrainers] = await Promise.all([
          getClassSchedule(),
          getTrainers()
        ]);
        let nextBookings = [];
        let nextBookingCounts = await getClassBookingCounts().catch((error) => {
          console.error(error);
          return {};
        });

        if (memberEmail) {
          try {
            nextBookings = await getClassBookings(memberEmail);
          } catch (bookingError) {
            console.error(bookingError);
          }
        }

        if (isCurrent) {
          setSchedule(nextSchedule);
          setTrainers(nextTrainers);
          setBookedClassIds(
            new Set(nextBookings.map((booking) => booking.classId))
          );
          setBookingCounts(nextBookingCounts);
          setStatus('ready');
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setSchedule([]);
          setTrainers([]);
          setStatus('error');
        }
      }
    }

    loadClasses();

    return () => {
      isCurrent = false;
    };
  }, [memberEmail]);

  useEffect(() => {
    if (!bookingMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setBookingMessage('');
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [bookingMessage]);

  const toggleBooking = async (classItem) => {
    if (!memberEmail) {
      setBookingMessage('Sign in with Clerk before booking a class.');
      return;
    }

    try {
      setBookingStatus(classItem.id);
      setBookingMessage('');

      const result = await toggleClassBooking({
        memberEmail,
        memberName,
        classId: classItem.id,
        className: classItem.name,
        classTime: formatClassTime(classItem.time),
        classDate: String(activeDay),
        trainerName: classItem.trainerName,
        category: classItem.category,
        capacity: classItem.capacity
      });

      setBookedClassIds(
        new Set((result.bookings || []).map((booking) => booking.classId))
      );
      setBookingCounts(result.bookingCounts || {});
      setBookingMessage(
        result.booked
          ? 'Class booked. Your schedule has been updated.'
          : 'Class booking removed.'
      );
    } catch (error) {
      console.error(error);
      setBookingMessage(error.message || 'Unable to update class booking.');
    } finally {
      setBookingStatus('idle');
    }
  };

  return (
    <section className='min-w-0 pb-2'>
      <header>
        <h1 className='m-0 mb-2 text-[clamp(34px,4vw,38px)] leading-none tracking-normal'>
          Classes
        </h1>
        <p className='m-0 text-base text-[#bdbdbd]'>
          Book your next workout class and manage your schedule.
        </p>
      </header>

      <div className='mt-6.5 grid grid-cols-1 gap-5 sm:max-w-96 sm:grid-cols-2'>
        <article className='grid min-h-23.5 grid-cols-[46px_minmax(0,1fr)] items-center rounded-[28px] border border-[#414141] bg-[#252525] px-5.5 py-4.5 shadow-[0_24px_70px_rgba(0,0,0,0.38)]'>
          <strong className='text-[32px] leading-none text-[#e6002e]'>
            {classesToday}
          </strong>
          <div>
            <b className='block text-[13px] leading-[1.15]'>Classes Today</b>
            <small className='mt-1.75 block text-xs text-[#bdbdbd]'>
              This week
            </small>
          </div>
        </article>
        <article className='grid min-h-23.5 grid-cols-[46px_minmax(0,1fr)] items-center rounded-[28px] border border-[#414141] bg-[#252525] px-5.5 py-4.5 shadow-[0_24px_70px_rgba(0,0,0,0.38)]'>
          <strong className='text-[32px] leading-none text-[#30ff00]'>
            {bookedThisWeek}
          </strong>
          <div>
            <b className='block text-[13px] leading-[1.15]'>Booked</b>
            <small className='mt-1.75 block text-xs text-[#bdbdbd]'>
              This week
            </small>
          </div>
        </article>
      </div>

      <div
        className='mt-7.5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:max-w-158 xl:grid-cols-6'
        aria-label='Select class day'
      >
        {weekDays.map((day) => (
          <button
            className={
              day.day === activeDay
                ? 'min-h-14 cursor-pointer rounded-full border border-[#e6002e] bg-[#e6002e] px-5 font-[inherit] font-black text-white shadow-[0_18px_36px_rgba(230,0,46,0.22)]'
                : 'min-h-14 cursor-pointer rounded-full border border-[#414141] bg-[#252525] px-5 font-[inherit] font-black text-white transition hover:border-[#e6002e]'
            }
            key={`${day.label}-${day.date}`}
            onClick={() => setActiveDay(day.day)}
            type='button'
          >
            <strong className='block text-[13px] leading-none'>
              {day.label}
            </strong>
            <span
              className={
                day.day === activeDay
                  ? 'mt-2 block text-xs text-white'
                  : 'mt-2 block text-xs text-[#bdbdbd]'
              }
            >
              {day.date}
            </span>
          </button>
        ))}
      </div>

      <div className='mt-5.5 flex flex-wrap gap-3' aria-label='Filter classes'>
        {classFilters.map((filter) => (
          <button
            className={
              filter === activeFilter
                ? 'min-h-9 min-w-18.5 cursor-pointer rounded-full border border-[#e6002e] bg-transparent px-5 font-[inherit] text-xs font-black text-white'
                : 'min-h-9 min-w-18.5 cursor-pointer rounded-full border border-[#414141] bg-[#252525] px-5 font-[inherit] text-xs font-black text-[#bdbdbd]'
            }
            key={filter}
            onClick={() => setActiveFilter(filter)}
            type='button'
          >
            {filter}
          </button>
        ))}
      </div>

      {status === 'loading' && (
        <p className='mt-7 flex min-h-21.5 items-center rounded-[28px] border border-[#414141] bg-[#252525] px-5.5 text-sm font-black text-white'>
          Loading classes...
        </p>
      )}

      {status === 'error' && (
        <p className='mt-7 flex min-h-21.5 items-center rounded-[28px] border border-[#414141] bg-[#252525] px-5.5 text-sm font-black text-[#ff8ea2]'>
          Class schedule is unavailable. Start the API server and try again.
        </p>
      )}

      {status === 'ready' && visibleClasses.length === 0 && (
        <p className='mt-7 flex min-h-21.5 items-center rounded-[28px] border border-[#414141] bg-[#252525] px-5.5 text-sm font-black text-white'>
          No classes match this view.
        </p>
      )}

      {status === 'ready' && visibleClasses.length > 0 && (
        <div className='mt-7 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]'>
          {visibleClasses.map((classItem) => {
            const isBooked = bookedClassIds.has(classItem.id);
            const isFull = classItem.availableSpots === 0;
            const category = categoryLabels[classItem.category] || 'CLASS';
            const color = classItem.color || 'gray';

            return (
              <article
                className={`relative min-h-44.5 overflow-hidden rounded-[30px] border border-[#414141] bg-[#252525] px-5.25 pb-3 pt-6 shadow-[0_24px_70px_rgba(0,0,0,0.38)] before:absolute before:left-0 before:right-0 before:top-0 before:h-1.5 before:content-[''] ${classAccentClasses[color] || classAccentClasses.gray}`}
                key={classItem.id}
              >
                <div className='flex items-start justify-between gap-3.5'>
                  <h2 className='m-0 min-w-0 text-[19px] leading-[1.05]'>
                    {classItem.name.replace('®', '')}
                  </h2>
                  <span
                    className={`min-w-13.5 flex-none rounded-full px-3 py-2 text-center text-[9px] font-black ${classBadgeClasses[color] || classBadgeClasses.gray}`}
                  >
                    {category}
                  </span>
                </div>
                <time className='mt-4 block text-base font-black'>
                  {formatClassTime(classItem.time)}
                </time>
                <p className='m-0 mt-2 text-xs text-[#bdbdbd]'>
                  {classItem.duration.replace('min', ' min')} •{' '}
                  {classItem.category === 'BIKE'
                    ? 'Cycle Room'
                    : classItem.category === 'YOGA'
                      ? 'Yoga Room'
                      : classItem.color === 'teal'
                        ? 'Studio B'
                        : 'Main Studio'}
                </p>
                <strong className='mt-3.25 block text-xs'>
                  {classItem.trainerName}
                </strong>
                <div className='mt-2.75 grid grid-cols-[86px_minmax(0,1fr)] items-end gap-2.5 max-[680px]:grid-cols-1'>
                  <span
                    className={
                      isFull
                        ? 'min-w-19.5 justify-self-start rounded-full bg-[#e6002e] px-3.25 py-2 text-center text-[10px] font-black text-white'
                        : 'min-w-19.5 justify-self-start rounded-full bg-[#30ff00] px-3.25 py-2 text-center text-[10px] font-black text-[#101010]'
                    }
                  >
                    {isBooked
                      ? 'Booked'
                      : isFull
                        ? 'Full'
                        : `${classItem.availableSpots} spots`}
                  </span>
                  <button
                    className='min-h-8 cursor-pointer rounded-full border-0 bg-[#e6002e] px-4 font-[inherit] text-xs font-black text-white shadow-[0_14px_24px_rgba(230,0,46,0.18)] disabled:cursor-not-allowed disabled:opacity-70'
                    disabled={
                      (isFull && !isBooked) || bookingStatus === classItem.id
                    }
                    onClick={() => toggleBooking(classItem)}
                    type='button'
                  >
                    {bookingStatus === classItem.id
                      ? 'Saving...'
                      : isBooked
                        ? 'Booked'
                        : 'Book Class'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {bookingMessage && (
        <p className='mt-5 rounded-[18px] border border-[#414141] bg-[#252525] px-5 py-3 text-sm font-black text-white'>
          {bookingMessage}
        </p>
      )}
    </section>
  );
}

function DashboardContent({ user = null }) {
  const [activePage, setActivePage] = useState(() =>
    getDashboardPageFromHash()
  );

  useEffect(() => {
    const updateActivePage = () => {
      setActivePage(getDashboardPageFromHash());
    };

    window.addEventListener('hashchange', updateActivePage);

    return () => {
      window.removeEventListener('hashchange', updateActivePage);
    };
  }, []);

  return (
    <DashboardLayout activePage={activePage} user={user}>
      {activePage === 'Classes' ? (
        <MemberClassesPage user={user} />
      ) : (
        <DashboardPlaceholder />
      )}
    </DashboardLayout>
  );
}

function AuthenticatedDashboard() {
  const { user } = useUser();
  const [accessStatus, setAccessStatus] = useState('loading');
  const [accessMessage, setAccessMessage] = useState('');
  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress;
  const memberName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  useEffect(() => {
    let isCurrent = true;

    async function verifyPaymentAccess() {
      if (!email) {
        setAccessStatus('unpaid');
        return;
      }

      const savedAccess = getSavedPaidMembershipAccess(email);

      if (savedAccess?.paid) {
        setAccessStatus('paid');
      }

      try {
        if (!savedAccess?.paid) {
          setAccessStatus('loading');
        }
        setAccessMessage('');
        const access = await getStripePaymentAccess(email, memberName);

        if (isCurrent) {
          if (access.paid) {
            savePaidMembershipAccess({
              email,
              memberName,
              plan: {
                name: access.planName,
                slug: access.planSlug
              }
            });
            setAccessStatus('paid');
          } else {
            setAccessStatus(savedAccess?.paid ? 'paid' : 'unpaid');
          }
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setAccessStatus('paid');
        }
      }
    }

    verifyPaymentAccess();

    return () => {
      isCurrent = false;
    };
  }, [email, memberName]);

  if (accessStatus === 'loading') {
    return (
      <DashboardState
        title='Checking payment'
        message='Verifying your Stripe membership payment...'
      />
    );
  }

  if (accessStatus !== 'paid') {
    return <PaymentRequired warning={accessMessage} />;
  }

  return <DashboardContent user={user} />;
}

function DashboardState({ title, message }) {
  return (
    <main className={authShellClass}>
      <section className={authCardClass}>
        <h1 className='m-0 mb-2 text-2xl leading-none'>{title}</h1>
        <p className='m-0 text-[#bdbdbd]'>{message}</p>
      </section>
    </main>
  );
}

function PaymentRequired({ warning = '' }) {
  return (
    <main className={authShellClass}>
      <section className={authCardClass}>
        <h1 className='m-0 mb-2 text-2xl leading-none'>Payment required</h1>
        <p className='m-0 mb-5.5 text-[#bdbdbd]'>
          Complete your membership payment before opening the member dashboard.
        </p>
        {warning && <p className={authWarningClass}>{warning}</p>}
        <a className={authLinkClass} href='/choose-plan'>
          Choose a plan
        </a>
      </section>
    </main>
  );
}

function UserDashboard({ clerkEnabled }) {
  return (
    <>
      {clerkEnabled ? (
        <>
          <SignedIn>
            <AuthenticatedDashboard />
          </SignedIn>
          <SignedOut>
            <main className={authShellClass}>
              <section className={authCardClass}>
                <h1 className='m-0 mb-2 text-2xl leading-none'>
                  Login required
                </h1>
                <p className='m-0 mb-5.5 text-[#bdbdbd]'>
                  Sign in to view your FitZone dashboard.
                </p>
                <a className={authLinkClass} href='/login'>
                  Go to login
                </a>
              </section>
            </main>
          </SignedOut>
        </>
      ) : (
        <main className={authShellClass}>
          <section className={authCardClass}>
            <h1 className='m-0 mb-2 text-2xl leading-none'>Connect Clerk</h1>
            <p className='m-0 mb-5.5 text-[#bdbdbd]'>
              Clerk is required to match members to Stripe payments.
            </p>
            <a className={authLinkClass} href='/login'>
              Back to login
            </a>
          </section>
        </main>
      )}
    </>
  );
}

export default UserDashboard;
