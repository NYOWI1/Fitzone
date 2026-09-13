import { useEffect, useState } from 'react';
import {
  createStripeBillingPortal,
  getMemberPayments
} from '../../../../shared/api';

function formatAmount(payment) {
  const amount = Number(payment?.amount || 0);
  const currency = String(payment?.currency || 'THB').toUpperCase();

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDate(value, fallback = 'Not available') {
  if (!value) return fallback;

  const date =
    typeof value === 'number'
      ? new Date(value * 1000)
      : new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function getPaymentMethod(payment) {
  if (payment?.paymentType === 'credit_card') {
    const brand = payment.card?.brand || 'Card';
    const last4 = payment.card?.last4 ? ` ending ${payment.card.last4}` : '';
    return `${brand}${last4}`;
  }

  return payment?.method || 'PromptPay QR';
}

export default function PaymentsPage({ membershipAccess = null, user = null }) {
  const [payments, setPayments] = useState([]);
  const [status, setStatus] = useState('loading');
  const [portalStatus, setPortalStatus] = useState('idle');
  const [portalMessage, setPortalMessage] = useState('');
  const memberEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    '';
  const paidPayments = payments.filter((payment) => payment.status === 'Paid');
  const latestPayment = payments[0] || null;
  const paymentMethodRecord = paidPayments[0] || latestPayment;
  const savedCard = paymentMethodRecord?.card || null;
  const totalPaid = paidPayments.reduce(
    (total, payment) => total + Number(payment.amount || 0),
    0
  );
  const renewalIsAutomatic =
    membershipAccess?.autoRenew ??
    paymentMethodRecord?.paymentType === 'credit_card';
  const renewalNeedsPayment = membershipAccess?.status === 'past_due';
  const renewalIsProcessing =
    !renewalNeedsPayment &&
    membershipAccess?.renewalPaymentConfirmed === false;
  const renewalDate = renewalNeedsPayment
    ? 'Payment retry required'
    : renewalIsProcessing
      ? 'Renewal processing'
      : formatDate(
          membershipAccess?.currentPeriodEnd ||
            membershipAccess?.currentPeriodEndDate,
          'Billing date unavailable'
        );
  const cardType = savedCard ? 'Debit / Credit Card' : 'PromptPay QR';
  const cardExpiry =
    savedCard?.expMonth && savedCard?.expYear
      ? `${String(savedCard.expMonth).padStart(2, '0')}/${String(savedCard.expYear).slice(-2)}`
      : 'Not available';
  const cardBrand = savedCard?.brand
    ? savedCard.brand.charAt(0).toUpperCase() + savedCard.brand.slice(1)
    : '';

  async function openBillingPortal() {
    setPortalStatus('loading');
    setPortalMessage('');

    try {
      const session = await createStripeBillingPortal(memberEmail);

      if (!session.url) {
        throw new Error('Stripe did not return a billing portal link.');
      }

      window.location.assign(session.url);
    } catch (error) {
      setPortalMessage(error.message);
      setPortalStatus('error');
    }
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadPayments() {
      if (!memberEmail) {
        setStatus('error');
        return;
      }

      try {
        const nextPayments = await getMemberPayments(memberEmail);

        if (isCurrent) {
          setPayments(nextPayments);
          setStatus('ready');
        }
      } catch (error) {
        console.error(error);
        if (isCurrent) setStatus('error');
      }
    }

    loadPayments();
    return () => {
      isCurrent = false;
    };
  }, [memberEmail]);

  return (
    <section className='min-w-0 pb-6'>
      <header className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='m-0 mb-2 text-3xl font-black leading-none sm:text-[38px]'>
            Payments
          </h1>
          <p className='m-0 text-sm text-[#bdbdbd] sm:text-base'>
            Review your billing cycle, payment method, and transaction history.
          </p>
        </div>
        <a
          className='inline-flex min-h-11 w-full items-center justify-center rounded-[14px] bg-[#e6002e] px-6 text-sm font-black text-white no-underline transition hover:bg-[#ff1748] sm:w-auto'
          href='/choose-plan'
        >
          Change plan
        </a>
      </header>

      {status === 'loading' && (
        <p className='mt-7 rounded-[24px] border border-[#414141] bg-[#252525] px-5 py-6 text-sm font-bold text-[#bdbdbd]'>
          Loading your payments...
        </p>
      )}

      {status === 'error' && (
        <p className='mt-7 rounded-[24px] border border-[#6b2632] bg-[#321b20] px-5 py-6 text-sm font-bold text-[#ff8ea2]'>
          Your payment history is temporarily unavailable.
        </p>
      )}

      {status === 'ready' && (
        <>
          <div className='mt-7 grid grid-cols-1 gap-5 md:grid-cols-3'>
            <article className='min-h-32 rounded-[24px] border border-[#414141] bg-[#252525] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)]'>
              <h2 className='m-0 text-base font-black underline'>
                Payment Method
              </h2>
              <p className='mb-0 mt-3 text-sm font-bold text-[#d8d8d8]'>
                {cardType}
              </p>
              <strong className='mt-3 block tracking-[3px] text-xl font-black text-[#e6002e]'>
                {savedCard?.last4
                  ? `•••• •••• •••• ${savedCard.last4}`
                  : 'PromptPay QR'}
              </strong>
              <small className='mt-3 block text-xs text-[#8f8f8f]'>
                {savedCard
                  ? `Expires ${cardExpiry}${cardBrand ? ` • ${cardBrand}` : ''}`
                  : 'Manual payment method'}
              </small>
              {savedCard && (
                <button
                  className='mt-4 min-h-9 min-w-28 cursor-pointer rounded-[11px] border-0 bg-[#e6002e] px-4 text-xs font-black text-white transition hover:bg-[#ff1748] disabled:cursor-wait disabled:opacity-60'
                  disabled={portalStatus === 'loading'}
                  onClick={openBillingPortal}
                  type='button'
                >
                  {portalStatus === 'loading' ? 'Opening...' : 'Edit Card'}
                </button>
              )}
              {portalMessage && (
                <p
                  className='mb-0 mt-3 text-xs font-bold text-[#ff8ea2]'
                  role='alert'
                >
                  {portalMessage}
                </p>
              )}
            </article>

            <article className='min-h-32 rounded-[24px] border border-[#414141] bg-[#252525] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)]'>
              <span className='text-xs font-black uppercase text-[#bdbdbd]'>
                Next billing
              </span>
              <strong className='mt-4 block break-words text-xl font-black text-[#e6002e]'>
                {renewalDate}
              </strong>
              <small className='mt-2 block text-xs text-[#bdbdbd]'>
                {renewalIsAutomatic
                  ? renewalNeedsPayment
                    ? 'Update your card so Stripe can retry automatically'
                    : renewalIsProcessing
                      ? 'Stripe is confirming the automatic card payment'
                      : 'Card renews automatically'
                  : 'PromptPay requires a new payment'}
              </small>
            </article>

            <article className='min-h-32 rounded-[24px] border border-[#414141] bg-[#252525] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)]'>
              <span className='text-xs font-black uppercase text-[#bdbdbd]'>
                Total paid
              </span>
              <strong className='mt-4 block text-2xl font-black text-[#e6002e]'>
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'THB',
                  maximumFractionDigits: 0
                }).format(totalPaid)}
              </strong>
              <small className='mt-2 block text-xs text-[#bdbdbd]'>
                {paidPayments.length} successful payment
                {paidPayments.length === 1 ? '' : 's'}
              </small>
            </article>
          </div>

          <section className='mt-6 overflow-hidden rounded-[28px] border border-[#414141] bg-[#252525] shadow-[0_24px_65px_rgba(0,0,0,0.3)]'>
            <div className='border-b border-[#414141] px-5 py-5 sm:px-7'>
              <h2 className='m-0 text-xl font-black sm:text-2xl'>
                Payment History
              </h2>
              <p className='mb-0 mt-2 text-sm text-[#bdbdbd]'>
                Stripe transactions associated with {memberEmail}.
              </p>
            </div>

            {payments.length === 0 ? (
              <p className='m-5 rounded-[16px] border border-[#414141] bg-[#202020] px-4 py-5 text-sm font-bold text-[#bdbdbd] sm:m-7'>
                No payment transactions are available yet.
              </p>
            ) : (
              <div className='grid gap-3 p-4 sm:p-6'>
                <div className='hidden grid-cols-[minmax(120px,0.8fr)_minmax(110px,0.8fr)_minmax(130px,1fr)_minmax(100px,0.6fr)_90px] gap-4 px-4 text-xs font-black uppercase text-[#8f8f8f] lg:grid'>
                  <span>Date</span>
                  <span>Plan</span>
                  <span>Method</span>
                  <span>Amount</span>
                  <span>Status</span>
                </div>

                {payments.map((payment) => (
                  <article
                    className='grid min-w-0 grid-cols-1 gap-3 rounded-[18px] border border-[#414141] bg-[#2c2c2c] p-4 lg:grid-cols-[minmax(120px,0.8fr)_minmax(110px,0.8fr)_minmax(130px,1fr)_minmax(100px,0.6fr)_90px] lg:items-center lg:gap-4'
                    key={payment.invoice}
                  >
                    <span className='text-sm font-bold'>
                      {formatDate(payment.date)}
                    </span>
                    <span className='min-w-0 break-words text-sm text-[#bdbdbd]'>
                      {payment.plan}
                    </span>
                    <span className='min-w-0 break-words text-sm text-[#bdbdbd]'>
                      {getPaymentMethod(payment)}
                    </span>
                    <strong className='text-sm'>{formatAmount(payment)}</strong>
                    <span
                      className={
                        payment.status === 'Paid'
                          ? 'w-fit rounded-full bg-[rgba(48,230,0,0.14)] px-3 py-1.5 text-xs font-black text-[#30e600]'
                          : payment.status === 'Failed'
                            ? 'w-fit rounded-full bg-[rgba(230,0,46,0.14)] px-3 py-1.5 text-xs font-black text-[#ff6f89]'
                            : 'w-fit rounded-full bg-[rgba(255,213,79,0.14)] px-3 py-1.5 text-xs font-black text-[#ffd54f]'
                      }
                    >
                      {payment.status}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
