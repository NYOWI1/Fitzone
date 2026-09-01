import { useEffect, useMemo, useState } from 'react';
import { getAdminTrainerBookings } from '../../../../shared/api';
import AdminLoadingSkeleton from '../../components/AdminLoadingSkeleton';

const tableGridClass =
  'grid min-w-0 items-center gap-2.5 [grid-template-columns:minmax(190px,1.35fr)_minmax(150px,1fr)_minmax(100px,0.72fr)_minmax(82px,0.58fr)_minmax(82px,0.58fr)] max-[980px]:[grid-template-columns:minmax(0,1fr)_auto] max-[980px]:items-start max-[980px]:gap-x-3.5 max-[980px]:gap-y-2.5 max-[560px]:[grid-template-columns:minmax(0,1fr)]';
const mutedCellClass =
  'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#b8b8b8] max-[980px]:flex max-[980px]:min-h-[34px] max-[980px]:items-center max-[980px]:rounded-[11px] max-[980px]:bg-[rgba(15,15,15,0.35)] max-[980px]:px-2.5';
const filterTabClass =
  'min-h-[30px] rounded-[10px] bg-transparent px-3.5 text-xs font-extrabold text-[#b8b8b8] max-[980px]:flex-1';
const activeFilterTabClass = `${filterTabClass} bg-[#d90429] text-white`;
const emptyRowClass =
  'm-0 flex min-h-16 items-center rounded-2xl border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3.5 text-[13px] font-extrabold text-[#b8b8b8]';

function getTodayIsoDate() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000;

  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function getBookingStatus(booking, today) {
  if (booking.active === false) {
    return 'Cancelled';
  }

  if (booking.sessionDate === today) {
    return 'Today';
  }

  return booking.sessionDate < today ? 'Completed' : 'Upcoming';
}

function formatSessionDate(value) {
  if (!value) {
    return 'Not scheduled';
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function getStatusPillClass(status) {
  if (status === 'Today') {
    return 'bg-[rgba(57,230,0,0.12)] text-[#39e600]';
  }

  if (status === 'Upcoming') {
    return 'bg-[rgba(77,163,255,0.14)] text-[#4da3ff]';
  }

  if (status === 'Cancelled') {
    return 'bg-[rgba(217,4,41,0.15)] text-[#ff5f78]';
  }

  return 'bg-[rgba(184,184,184,0.12)] text-[#b8b8b8]';
}

export default function PTBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState('loading');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const today = getTodayIsoDate();

  useEffect(() => {
    let isCurrent = true;

    async function loadBookings() {
      try {
        const nextBookings = await getAdminTrainerBookings();

        if (isCurrent) {
          setBookings(nextBookings);
          setStatus('ready');
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setBookings([]);
          setStatus('error');
        }
      }
    }

    loadBookings();

    return () => {
      isCurrent = false;
    };
  }, []);

  const bookingRecords = useMemo(
    () =>
      bookings.map((booking) => ({
        ...booking,
        displayStatus: getBookingStatus(booking, today)
      })),
    [bookings, today]
  );
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleBookings = bookingRecords.filter((booking) => {
    const matchesStatus =
      statusFilter === 'All' || booking.displayStatus === statusFilter;
    const matchesSearch =
      !normalizedSearch ||
      [
        booking.memberName,
        booking.memberEmail,
        booking.trainerName,
        booking.sessionDate,
        booking.sessionTime
      ].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(normalizedSearch)
      );

    return matchesStatus && matchesSearch;
  });
  const activeBookings = bookingRecords.filter(
    (booking) => booking.active !== false
  );
  const stats = [
    {
      label: 'Active Bookings',
      note: 'Current PT reservations',
      tone: 'red',
      value: activeBookings.length
    },
    {
      label: "Today's Sessions",
      note: 'Sessions scheduled today',
      tone: 'green',
      value: activeBookings.filter((booking) => booking.sessionDate === today)
        .length
    },
    {
      label: 'Upcoming',
      note: 'Future PT sessions',
      tone: 'blue',
      value: activeBookings.filter((booking) => booking.sessionDate > today)
        .length
    },
    {
      label: 'Trainers Booked',
      note: 'Coaches with reservations',
      tone: 'yellow',
      value: new Set(activeBookings.map((booking) => booking.trainerSlug)).size
    }
  ];

  return (
    <section className='admin-content gap-0' id='pt-bookings'>
      <header className='admin-header'>
        <div>
          <h2>PT Bookings</h2>
          <p>
            See which members booked each personal trainer, including session
            dates, times, and current booking status.
          </p>
        </div>

        <div className='admin-header-actions'>
          <label className='admin-search'>
            <span className='sr-only'>Search PT bookings</span>
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder='Search bookings...'
              type='search'
              value={searchTerm}
            />
          </label>
        </div>
      </header>

      {status === 'loading' && <AdminLoadingSkeleton />}

      {status === 'error' && (
        <p className='admin-state-message error'>
          PT bookings are temporarily unavailable. Check the API server and try
          again.
        </p>
      )}

      {status === 'ready' && (
        <>
          <div className='admin-kpi-grid flex-none'>
            {stats.map((stat) => (
              <article className='admin-kpi-card' key={stat.label}>
                <span className={`admin-kpi-icon ${stat.tone}`}></span>
                <div className='admin-kpi-copy'>
                  <h3>{stat.label}</h3>
                  <p>{stat.note}</p>
                </div>
                <strong className={stat.tone}>{stat.value}</strong>
              </article>
            ))}
          </div>

          <section className='admin-card min-h-[480px] min-[1440px]:min-h-[540px]'>
            <div className='admin-card-header admin-table-header'>
              <h3>Booking Schedule</h3>
              <div
                aria-label='Filter PT bookings'
                className='flex gap-1 rounded-[14px] border border-[#393939] bg-[#2b2b2b] p-1 max-[980px]:w-full max-[980px]:overflow-x-auto'
              >
                {['All', 'Today', 'Upcoming', 'Completed', 'Cancelled'].map(
                  (filter) => (
                    <button
                      className={
                        statusFilter === filter
                          ? activeFilterTabClass
                          : filterTabClass
                      }
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      type='button'
                    >
                      {filter}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className='grid min-w-0 gap-2.5'>
              <div
                className={`${tableGridClass} border-b border-[#393939] pb-3 text-[11px] font-extrabold uppercase text-[#b8b8b8] max-[980px]:hidden`}
              >
                <span>Member</span>
                <span>Trainer</span>
                <span>Date</span>
                <span>Time</span>
                <span>Status</span>
              </div>

              {visibleBookings.map((booking, index) => (
                <div
                  className={`${tableGridClass} min-h-[68px] rounded-2xl border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3 py-2.5 max-[980px]:min-h-0 max-[980px]:p-3.5`}
                  key={`${booking.memberEmail}-${booking.trainerSlug}-${booking.sessionDate}-${booking.sessionTime}-${index}`}
                >
                  <div className='flex min-w-0 items-center gap-3 max-[980px]:col-span-full'>
                    <span className='grid h-[38px] w-[38px] flex-[0_0_38px] place-items-center rounded-[14px] bg-[#d90429] text-sm font-black text-white'>
                      {(booking.memberName || booking.memberEmail || 'M')
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                    <div className='min-w-0'>
                      <strong className='mb-[5px] block truncate text-[13px] text-white'>
                        {booking.memberName || 'Member'}
                      </strong>
                      <small className='block truncate text-xs text-[#b8b8b8]'>
                        {booking.memberEmail}
                      </small>
                    </div>
                  </div>
                  <strong className='min-w-0 truncate text-[13px] text-white max-[980px]:flex max-[980px]:min-h-[34px] max-[980px]:items-center max-[980px]:rounded-[11px] max-[980px]:bg-[rgba(15,15,15,0.35)] max-[980px]:px-2.5'>
                    {booking.trainerName || 'Unassigned trainer'}
                  </strong>
                  <span className={mutedCellClass}>
                    {formatSessionDate(booking.sessionDate)}
                  </span>
                  <span className={mutedCellClass}>
                    {booking.sessionTime || 'Not set'}
                  </span>
                  <span
                    className={`inline-flex min-h-[30px] items-center justify-center rounded-full px-2.5 text-[11px] font-black ${getStatusPillClass(booking.displayStatus)}`}
                  >
                    {booking.displayStatus}
                  </span>
                </div>
              ))}

              {visibleBookings.length === 0 && (
                <p className={emptyRowClass}>
                  {bookings.length === 0
                    ? 'No PT sessions have been booked yet.'
                    : 'No PT bookings match the selected filters.'}
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
