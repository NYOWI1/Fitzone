import { useEffect, useState } from 'react';
import { getMembershipPlans } from '../../../../shared/api';
import { getPlanMonthlyLabel } from '../../../membership-flow/shared/planSelection';

function normalizePlanSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+membership$/, '')
    .replace(/\s+/g, '-');
}

function formatRenewalDate(membershipAccess) {
  const timestamp = Number(membershipAccess?.currentPeriodEnd || 0);
  const dateValue = timestamp
    ? new Date(timestamp * 1000)
    : membershipAccess?.currentPeriodEndDate
      ? new Date(`${membershipAccess.currentPeriodEndDate}T00:00:00`)
      : null;

  if (!dateValue || Number.isNaN(dateValue.getTime())) {
    return 'your next billing date';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(dateValue);
}

export default function MyPlanPage({ membershipAccess = null }) {
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const planSlug = normalizePlanSlug(
    membershipAccess?.planSlug || membershipAccess?.planName
  );
  const currentPlan =
    plans.find((plan) => plan.slug === planSlug) ||
    plans.find(
      (plan) => normalizePlanSlug(plan.name) === planSlug
    ) ||
    null;
  const planName = currentPlan?.name || membershipAccess?.planName || 'Membership';
  const renewalDate = formatRenewalDate(membershipAccess);
  const benefits = currentPlan?.features || [];

  useEffect(() => {
    let isCurrent = true;

    async function loadPlans() {
      try {
        const nextPlans = await getMembershipPlans();

        if (isCurrent) {
          setPlans(nextPlans);
          setStatus('ready');
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setStatus('error');
        }
      }
    }

    loadPlans();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setMessage(''), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  return (
    <section className='min-w-0 pb-6'>
      <header>
        <h1 className='m-0 mb-2 text-3xl font-black leading-none sm:text-[38px]'>
          My Plan
        </h1>
        <p className='m-0 text-sm text-[#bdbdbd] sm:text-base'>
          View your membership status, benefits, billing cycle, and upgrade options.
        </p>
      </header>

      <article className='relative mt-7 overflow-hidden rounded-[28px] border border-[#414141] bg-[#252525] px-5 py-6 shadow-[0_24px_70px_rgba(0,0,0,0.38)] before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-[#e6002e] before:content-["_"] sm:px-8 sm:py-8'>
        <h2 className='m-0 text-3xl font-black leading-none text-[#e6002e] sm:text-[36px]'>
          {planName} Plan
        </h2>
        <strong className='mt-3 block text-xl sm:text-2xl'>
          {currentPlan ? getPlanMonthlyLabel(currentPlan) : 'Monthly membership'}
          {currentPlan && <span className='text-base text-[#bdbdbd]'> / month</span>}
        </strong>
        <p className='mb-0 mt-3 text-sm text-[#bdbdbd]'>
          Active membership · renews on {renewalDate}
        </p>

        <div className='mt-5 flex flex-col gap-3 sm:flex-row'>
          <a
            className='inline-flex min-h-11.5 items-center justify-center rounded-[14px] bg-[#e6002e] px-8 text-sm font-black text-white no-underline transition hover:bg-[#ff1748]'
            href='/choose-plan'
          >
            {planSlug === 'premium' ? 'Change Plan' : 'Upgrade Plan'}
          </a>
          <button
            className='min-h-11.5 cursor-pointer rounded-[14px] border border-[#414141] bg-[#2d2d2d] px-8 font-[inherit] text-sm font-black text-white transition hover:border-[#e6002e]'
            onClick={() =>
              setMessage('Contact FitZone support to cancel your membership safely.')
            }
            type='button'
          >
            Cancel Plan
          </button>
        </div>
      </article>

      {status === 'loading' && (
        <p className='mt-6 rounded-[24px] border border-[#414141] bg-[#252525] px-5 py-6 text-sm font-bold text-[#bdbdbd]'>
          Loading plan benefits...
        </p>
      )}

      {status === 'error' && (
        <p className='mt-6 rounded-[24px] border border-[#414141] bg-[#252525] px-5 py-6 text-sm font-bold text-[#ff8ea2]'>
          Plan benefits are temporarily unavailable.
        </p>
      )}

      {status === 'ready' && benefits.length > 0 && (
        <div className='mt-6 grid grid-cols-1 gap-5 md:grid-cols-2'>
          {benefits.map((benefit) => (
            <article
              className='flex min-h-24 items-center rounded-[24px] border border-[#414141] bg-[#252525] px-6 py-4 shadow-[0_18px_45px_rgba(0,0,0,0.25)] sm:px-8'
              key={benefit}
            >
              <div className='min-w-0'>
                <h3 className='m-0 break-words text-base font-black sm:text-lg'>
                  {benefit}
                </h3>
                <p className='mb-0 mt-2 text-sm text-[#bdbdbd]'>Included</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {message && (
        <p
          className='fixed right-4 top-4 z-50 m-0 w-[calc(100%_-_32px)] max-w-sm rounded-[18px] border border-[#555] bg-[#252525] px-5 py-4 text-sm font-black text-white shadow-[0_20px_60px_rgba(0,0,0,0.55)] sm:right-6 sm:top-6'
          role='status'
          aria-live='polite'
        >
          {message}
        </p>
      )}
    </section>
  );
}
