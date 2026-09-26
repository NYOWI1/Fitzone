import { useEffect, useState } from 'react';
import {
  getTrainerBookings,
  getTrainers,
  updateTrainerBooking
} from '../../../../shared/api';
import DefaultProfileAvatar from '../../../../shared/ui/DefaultProfileAvatar';
import { attachTrainerImage } from '../../../../shared/trainers';
import { isTrainerReschedulingClosed } from '../../../../shared/trainers/rescheduling';
import './TrainersPage.css';

const sessionTimes = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00'
];

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatSessionDate(value) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(`${value}T00:00:00`));
}

function getPlanLimit(membershipAccess) {
  const slug = String(
    membershipAccess?.planSlug || membershipAccess?.planName || ''
  ).toLowerCase();

  if (slug.includes('premium')) return 4;
  if (slug.includes('standard')) return 2;
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

export default function TrainersPage({ user = null, membershipAccess = null }) {
  const [trainers, setTrainers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState('loading');
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [reschedulingBooking, setReschedulingBooking] = useState(null);
  const [sessionDate, setSessionDate] = useState(formatIsoDate(new Date()));
  const [sessionTime, setSessionTime] = useState('09:00');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const memberEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    '';
  const memberName = user?.fullName || 'Member';
  const limit = getPlanLimit(membershipAccess);
  const { start: periodStart, end: periodEnd } =
    getMembershipPeriod(membershipAccess);
  const used = bookings.filter(
    (booking) =>
      booking.sessionDate >= periodStart && booking.sessionDate < periodEnd
  ).length;
  const remaining = Math.max(limit - used, 0);
  const lastBookingDate = periodEnd
    ? formatIsoDate(
        new Date(new Date(`${periodEnd}T00:00:00`).getTime() - 86_400_000)
      )
    : '';

  useEffect(() => {
    let isCurrent = true;

    async function loadPage() {
      try {
        const [nextTrainers, nextBookings] = await Promise.all([
          getTrainers(),
          memberEmail ? getTrainerBookings(memberEmail) : []
        ]);

        if (isCurrent) {
          setTrainers(nextTrainers.map(attachTrainerImage));
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
    const timeoutId = window.setTimeout(() => setMessage(''), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  function openBooking(trainer) {
    if (limit === 0) {
      setMessage(
        'Basic membership does not include personal trainer sessions.'
      );
      return;
    }

    if (remaining === 0) {
      setMessage(
        `You have used all ${limit} trainer sessions for this membership month.`
      );
      return;
    }

    setReschedulingBooking(null);
    setSelectedTrainer(trainer);
    setSessionDate(
      periodStart && periodStart > formatIsoDate(new Date())
        ? periodStart
        : formatIsoDate(new Date())
    );
  }

  function openReschedule(booking) {
    if (isTrainerReschedulingClosed(booking)) {
      setMessage('Rescheduling closes 30 minutes before your PT session starts.');
      return;
    }
    const trainer = trainers.find(
      (item) => item.slug === booking.trainerSlug
    ) || {
      slug: booking.trainerSlug,
      name: booking.trainerName
    };

    setReschedulingBooking(booking);
    setSelectedTrainer(trainer);
    setSessionDate(
      booking.sessionDate < formatIsoDate(new Date())
        ? formatIsoDate(new Date())
        : booking.sessionDate
    );
    setSessionTime(booking.sessionTime);
  }

  function closeBookingForm() {
    setSelectedTrainer(null);
    setReschedulingBooking(null);
  }

  async function saveBooking(event) {
    event.preventDefault();
    if (!selectedTrainer) return;
    if (reschedulingBooking && isTrainerReschedulingClosed(reschedulingBooking)) {
      setMessage('Rescheduling closes 30 minutes before your PT session starts.');
      return;
    }

    try {
      setSaving(true);
      const result = await updateTrainerBooking({
        action: reschedulingBooking ? 'reschedule' : 'book',
        memberEmail,
        memberName,
        trainerSlug: selectedTrainer.slug,
        trainerName: selectedTrainer.name,
        sessionDate,
        sessionTime,
        ...(reschedulingBooking
          ? {
              originalSessionDate: reschedulingBooking.sessionDate,
              originalSessionTime: reschedulingBooking.sessionTime
            }
          : {})
      });
      setBookings(result.bookings || []);
      closeBookingForm();
      setMessage(
        reschedulingBooking
          ? 'Trainer session rescheduled successfully.'
          : 'Trainer session booked successfully.'
      );
    } catch (error) {
      console.error(error);
      setMessage(error.message || 'Unable to book trainer session.');
    } finally {
      setSaving(false);
    }
  }

  async function cancelBooking(booking) {
    try {
      setSaving(true);
      const result = await updateTrainerBooking({
        ...booking,
        action: 'cancel',
        memberName
      });
      setBookings(result.bookings || []);
      setMessage('Trainer session cancelled.');
    } catch (error) {
      console.error(error);
      setMessage(error.message || 'Unable to cancel trainer session.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className='member-trainers min-w-0 pb-6'>
      <header className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='m-0 mb-2 text-3xl font-black leading-none sm:text-[38px]'>
            Trainers
          </h1>
          <p className='m-0 text-sm text-[#bdbdbd] sm:text-base'>
            Meet your coaches, view specialties, and book a personal session.
          </p>
        </div>
        <p className='trainer-session-quota m-0 text-sm font-black text-[#bdbdbd]'>
          {limit === 0
            ? 'No sessions included'
            : `${remaining} of ${limit} sessions left`}
        </p>
      </header>

      {status === 'loading' && (
        <p className='mt-7 rounded-[24px] border border-[#414141] bg-[#252525] px-5 py-6 font-bold'>
          Loading trainers...
        </p>
      )}
      {status === 'error' && (
        <p className='mt-7 rounded-[24px] border border-[#414141] bg-[#252525] px-5 py-6 font-bold text-[#ff8ea2]'>
          Trainers are temporarily unavailable.
        </p>
      )}

      {status === 'ready' && (
        <div className='trainer-directory mt-7 grid grid-cols-1 gap-6 lg:grid-cols-2'>
          {trainers.map((trainer) => (
            <article
              className='grid min-h-54 grid-cols-1 gap-5 rounded-[28px] border border-[#414141] bg-[#252525] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.32)] sm:grid-cols-[82px_minmax(0,1fr)]'
              key={trainer.slug}
            >
              {trainer.image ? <img className='trainer-photo' src={trainer.image} alt={trainer.name} /> : <DefaultProfileAvatar className='h-20.5 w-20.5' name={trainer.name} />}
              <div className='min-w-0'>
                <h2 className='m-0 break-words text-xl font-black sm:text-2xl'>
                  {trainer.name}
                </h2>
                <p className='mb-0 mt-2 text-sm font-bold text-[#e6002e]'>
                  {trainer.role}
                </p>
                <p className='mb-0 mt-3 break-words text-sm text-[#bdbdbd]'>
                  {(trainer.specialties || []).slice(0, 2).join(' · ') ||
                    trainer.category}
                </p>
                <p className='mb-0 mt-3 text-xs text-[#d7d7d7]'>
                  4.9 rating · Available this month
                </p>
                <button
                  className='mt-5 min-h-10 w-full cursor-pointer rounded-[13px] border-0 bg-[#e6002e] px-6 font-[inherit] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto sm:min-w-40'
                  disabled={limit === 0 || remaining === 0}
                  onClick={() => openBooking(trainer)}
                  type='button'
                >
                  Book Session
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {bookings.length > 0 && (
        <section className='trainer-sessions mt-8'>
          <h2 className='m-0 text-xl font-black'>Your sessions</h2>
          <p className='reschedule-policy'>Rescheduling closes 30 minutes before the session starts.</p>
          <div className='mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2'>
            {bookings.map((booking) => (
              <article
                className='flex flex-col gap-4 rounded-[20px] border border-[#414141] bg-[#252525] p-4 sm:flex-row sm:items-center sm:justify-between'
                key={`${booking.trainerSlug}-${booking.sessionDate}-${booking.sessionTime}`}
              >
                <div className='min-w-0'>
                  <strong className='block truncate'>
                    {booking.trainerName}
                  </strong>
                  <span className='mt-1 block text-sm text-[#bdbdbd]'>
                    {formatSessionDate(booking.sessionDate)} ·{' '}
                    {booking.sessionTime}
                  </span>
                  {isTrainerReschedulingClosed(booking, now) && <small className='reschedule-closed'>Rescheduling closed</small>}
                </div>
                <div className='flex flex-col gap-2 sm:flex-row'>
                  <button
                    className='min-h-10 rounded-[12px] border border-[#e6002e] bg-[rgba(230,0,46,0.08)] px-5 text-sm font-black text-white hover:bg-[rgba(230,0,46,0.16)] disabled:opacity-60'
                    disabled={saving || isTrainerReschedulingClosed(booking, now)}
                    onClick={() => openReschedule(booking)}
                    type='button'
                  >
                    Reschedule
                  </button>
                  <button
                    className='min-h-10 rounded-[12px] border border-[#414141] bg-[#2d2d2d] px-5 text-sm font-black text-white hover:border-[#e6002e] disabled:opacity-60'
                    disabled={saving}
                    onClick={() => cancelBooking(booking)}
                    type='button'
                  >
                    Cancel
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {selectedTrainer && (
        <div className='trainer-booking-overlay fixed inset-0 z-40 grid place-items-center bg-[rgba(0,0,0,0.72)] p-4'>
          <form
            role='dialog'
            aria-modal='true'
            aria-labelledby='trainer-booking-heading'
            className='w-full max-w-md rounded-[26px] border border-[#414141] bg-[#252525] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.6)]'
            onSubmit={saveBooking}
          >
            <h2 id='trainer-booking-heading' className='m-0 text-2xl font-black'>
              {reschedulingBooking ? 'Reschedule' : 'Book'}{' '}
              {selectedTrainer.name}
            </h2>
            <p className='mb-5 mt-2 text-sm text-[#bdbdbd]'>
              {reschedulingBooking
                ? 'Choose a new date and time for this session.'
                : 'Select an available date and session time.'}
            </p>
            <label
              className='block text-xs font-black text-[#bdbdbd]'
              htmlFor='trainer-session-date'
            >
              Session date
            </label>
            <input
              className='mt-2 min-h-12 w-full rounded-[13px] border border-[#414141] bg-[#303030] px-4 text-white'
              id='trainer-session-date'
              max={lastBookingDate || undefined}
              min={
                periodStart > formatIsoDate(new Date())
                  ? periodStart
                  : formatIsoDate(new Date())
              }
              onChange={(event) => setSessionDate(event.target.value)}
              required
              type='date'
              value={sessionDate}
            />
            <label
              className='mt-4 block text-xs font-black text-[#bdbdbd]'
              htmlFor='trainer-session-time'
            >
              Session time
            </label>
            <select
              className='mt-2 min-h-12 w-full rounded-[13px] border border-[#414141] bg-[#303030] px-4 text-white'
              id='trainer-session-time'
              onChange={(event) => setSessionTime(event.target.value)}
              value={sessionTime}
            >
              {sessionTimes.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
            <div className='mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'>
              <button
                className='min-h-11 rounded-[13px] border border-[#414141] bg-[#303030] px-6 font-black text-white'
                onClick={closeBookingForm}
                type='button'
              >
                Close
              </button>
              <button
                className='min-h-11 rounded-[13px] border-0 bg-[#e6002e] px-6 font-black text-white disabled:opacity-60'
                disabled={saving || Boolean(reschedulingBooking && isTrainerReschedulingClosed(reschedulingBooking, now))}
                type='submit'
              >
                {saving
                  ? reschedulingBooking ? 'Rescheduling...' : 'Booking...'
                  : reschedulingBooking ? 'Confirm Reschedule' : 'Confirm Booking'}
              </button>
            </div>
          </form>
        </div>
      )}

      {message && (
        <p
          className='fz-notice fz-toast'
          role='status'
          aria-live='polite'
        >
          {message}
        </p>
      )}
    </section>
  );
}
