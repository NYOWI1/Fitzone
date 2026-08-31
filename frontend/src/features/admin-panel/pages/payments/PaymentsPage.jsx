import { useEffect, useState } from 'react';
import { getPayments } from '../../../../shared/api';
import {
  filterPayments,
  filterPaymentsByMethod,
  formatPaymentAmount,
  formatPaymentDate,
  getPaymentAmountValue,
  getPaymentDetail,
  getPaymentStats
} from '../../adminPanelUtils';
import AdminLoadingSkeleton from '../../components/AdminLoadingSkeleton';

const paymentTableGridClass =
  'grid min-w-0 items-center gap-2.5 [grid-template-columns:minmax(136px,1fr)_minmax(104px,0.78fr)_minmax(70px,0.52fr)_minmax(74px,0.5fr)_minmax(92px,0.7fr)_minmax(70px,0.52fr)_minmax(58px,0.44fr)] max-[980px]:[grid-template-columns:minmax(0,1fr)_auto] max-[980px]:items-start max-[980px]:gap-x-3.5 max-[980px]:gap-y-2.5 max-[560px]:[grid-template-columns:minmax(0,1fr)]';
const mutedPaymentCellClass =
  'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#b8b8b8] max-[980px]:flex max-[980px]:min-h-[34px] max-[980px]:items-center max-[980px]:rounded-[11px] max-[980px]:bg-[rgba(15,15,15,0.35)] max-[980px]:px-2.5';
const filterTabClass =
  'min-h-[30px] rounded-[10px] bg-transparent px-3.5 text-xs font-extrabold text-[#b8b8b8] max-[980px]:flex-1 max-[980px]:basis-auto';
const activeFilterTabClass = `${filterTabClass} bg-[#d90429] text-white`;
const emptyRowClass =
  'm-0 flex min-h-16 items-center rounded-2xl border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3.5 text-[13px] font-extrabold text-[#b8b8b8]';
const rowActionClass =
  'min-h-[34px] rounded-[11px] border border-[#393939] bg-transparent text-xs font-extrabold text-[#eaeaea] max-[980px]:flex max-[980px]:items-center max-[980px]:justify-center';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [status, setStatus] = useState('loading');
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('All');
  const methodFilteredPayments = filterPaymentsByMethod(payments, methodFilter);
  const visiblePayments = filterPayments(methodFilteredPayments, searchTerm);
  const paymentStats = getPaymentStats(payments);
  const paidPayments = payments.filter((payment) => payment.status === 'Paid');
  const paidTotal = paidPayments.reduce(
    (total, payment) => total + getPaymentAmountValue(payment),
    0
  );
  const paymentMethods = payments.reduce(
    (methods, payment) => ({
      ...methods,
      [payment.method]: (methods[payment.method] || 0) + 1
    }),
    {}
  );

  useEffect(() => {
    let isCurrent = true;

    async function loadPaymentsData() {
      try {
        const nextPayments = await getPayments();

        if (isCurrent) {
          setPayments(nextPayments);
          setStatus('ready');
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setPayments([]);
          setStatus('error');
        }
      }
    }

    loadPaymentsData();

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <section className='admin-content gap-0' id='payments'>
      <header className='admin-header'>
        <div>
          <h2>Payments</h2>
          <p>
            Track Stripe payment intents, payment methods, paid revenue, and
            failed payment follow-ups.
          </p>
        </div>

        <div className='admin-header-actions'>
          <label className='admin-search'>
            <span className='sr-only'>Search payments</span>
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder='Search payments...'
              type='search'
              value={searchTerm}
            />
          </label>
        </div>
      </header>

      {status === 'loading' && <AdminLoadingSkeleton />}

      {status === 'error' && (
        <p className='admin-state-message error'>
          Stripe payments are unavailable. Check STRIPE_SECRET_KEY and the API
          server.
        </p>
      )}

      {status === 'ready' && payments.length === 0 && (
        <p className='admin-state-message'>
          No Stripe payment records are available yet.
        </p>
      )}

      {status === 'ready' && payments.length > 0 && (
        <>
          <div className='admin-kpi-grid flex-none'>
            {paymentStats.map((stat) => (
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

          <div className='grid min-h-0 min-w-0 flex-1 gap-x-7 gap-y-6 [grid-template-columns:minmax(0,1.78fr)_minmax(280px,0.68fr)] max-[1360px]:grid-cols-1'>
            <section className='admin-card min-h-[480px] min-[1440px]:min-h-[540px]'>
              <div className='admin-card-header admin-table-header'>
                <h3>Payment Records</h3>
                <div
                  className='flex gap-1 rounded-[14px] border border-[#393939] bg-[#2b2b2b] p-1 max-[980px]:w-full max-[980px]:overflow-x-auto'
                  aria-label='Filter payments'
                >
                  {['All', 'Credit Card', 'PromptPay QR'].map((filter) => (
                    <button
                      className={
                        methodFilter === filter
                          ? activeFilterTabClass
                          : filterTabClass
                      }
                      key={filter}
                      onClick={() => setMethodFilter(filter)}
                      type='button'
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className='grid min-w-0 gap-2.5'>
                <div
                  className={`${paymentTableGridClass} border-b border-[#393939] pb-3 text-[11px] font-extrabold uppercase text-[#b8b8b8] max-[980px]:hidden`}
                >
                  <span>Invoice</span>
                  <span>Member</span>
                  <span>Plan</span>
                  <span>Amount</span>
                  <span>Method</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>

                {visiblePayments.map((payment) => (
                  <div
                    className={`${paymentTableGridClass} min-h-[68px] rounded-2xl border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3 py-2.5 max-[980px]:min-h-0 max-[980px]:p-3.5`}
                    key={payment.invoice}
                  >
                    <div className='flex min-w-0 items-center gap-3 max-[980px]:col-span-full'>
                      <span
                        className={
                          payment.status === 'Paid'
                            ? 'h-[38px] w-[38px] flex-[0_0_38px] rounded-[14px] bg-[#39e600]'
                            : 'h-[38px] w-[38px] flex-[0_0_38px] rounded-[14px] bg-[#ffd54f]'
                        }
                      ></span>
                      <div className='min-w-0'>
                        <strong className='mb-[5px] block text-[13px] text-white'>
                          {payment.invoice}
                        </strong>
                        <small className='block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#b8b8b8]'>
                          {formatPaymentDate(payment.date)}
                        </small>
                      </div>
                    </div>
                    <span className={mutedPaymentCellClass}>
                      {payment.member}
                    </span>
                    <span className={mutedPaymentCellClass}>
                      {payment.plan}
                    </span>
                    <b className='text-sm text-white max-[980px]:flex max-[980px]:min-h-[34px] max-[980px]:items-center max-[980px]:rounded-[11px] max-[980px]:bg-[rgba(15,15,15,0.35)] max-[980px]:px-2.5'>
                      {formatPaymentAmount(payment)}
                    </b>
                    <span className='grid min-w-0 gap-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#b8b8b8] max-[980px]:min-h-[34px] max-[980px]:rounded-[11px] max-[980px]:bg-[rgba(15,15,15,0.35)] max-[980px]:px-2.5 max-[980px]:py-1.5'>
                      {payment.method}
                      <small className='overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-extrabold text-[#8f8f8f]'>
                        {getPaymentDetail(payment)}
                      </small>
                    </span>
                    <span
                      className={`admin-status-pill ${payment.status.toLowerCase()}`}
                    >
                      {payment.status}
                    </span>
                    <button className={rowActionClass} type='button'>
                      View
                    </button>
                  </div>
                ))}

                {visiblePayments.length === 0 && (
                  <p className={emptyRowClass}>
                    No payments match your search.
                  </p>
                )}
              </div>
            </section>

            <aside className='grid min-h-0 grid-rows-[minmax(220px,0.8fr)_minmax(260px,1fr)] gap-6 max-[1360px]:grid-cols-2 max-[1360px]:grid-rows-none max-[980px]:grid-cols-1'>
              <section className='admin-card min-h-0'>
                <h3>Revenue Summary</h3>
                <div className='mt-[22px] grid gap-2.5 rounded-[18px] border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] p-[18px]'>
                  <span className='text-xs font-black text-[#d90429]'>
                    Collected
                  </span>
                  <strong className='text-3xl text-white'>
                    {paidTotal.toLocaleString()}฿
                  </strong>
                  <p className='m-0 text-xs leading-normal text-[#b8b8b8]'>
                    {paidPayments.length} paid invoices this period
                  </p>
                </div>
              </section>

              <section className='admin-card min-h-0'>
                <h3>Payment Methods</h3>
                <div className='mt-[22px] grid gap-3.5'>
                  {Object.entries(paymentMethods).map(([method, count]) => (
                    <div
                      className='grid min-h-12 grid-cols-[10px_1fr_auto] items-center gap-3 rounded-[15px] border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3.5'
                      key={method}
                    >
                      <span className='h-2.5 w-2.5 rounded-full bg-[#4da3ff]'></span>
                      <strong className='text-[13px] text-white'>
                        {method}
                      </strong>
                      <b className='text-[13px] text-[#b8b8b8]'>{count}</b>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
