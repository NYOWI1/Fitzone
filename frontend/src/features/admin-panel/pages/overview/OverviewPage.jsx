import { useEffect, useState } from 'react';
import {
  getClassSchedule,
  getMembers,
  getStripeRevenueOverview,
  getTrainers
} from '../../../../shared/api';
import {
  formatPaymentAmount,
  getOverviewKpis,
  getOverviewRecentMembers,
  getOverviewRevenueBars,
  getOverviewRevenueSummary,
  getOverviewTodayClasses
} from '../../adminPanelUtils';
import AdminLoadingSkeleton from '../../components/AdminLoadingSkeleton';
import DefaultProfileAvatar from '../../../../shared/ui/DefaultProfileAvatar';

const overviewMemberGridClass =
  'grid min-h-8 items-center gap-3.5 [grid-template-columns:32px_minmax(0,1fr)_minmax(230px,280px)] max-[560px]:gap-2.5 max-[560px]:[grid-template-columns:32px_minmax(0,1fr)_auto]';
const overviewMemberMetaClass =
  'grid min-w-0 grid-cols-[90px_88px_74px] items-center gap-3.5 max-[560px]:flex max-[560px]:flex-col max-[560px]:items-end max-[560px]:gap-1';
const overviewCardClass = 'admin-card min-h-0';
const revenueChartWidth = 720;
const revenueChartHeight = 220;
const revenueChartBaseline = 170;
const revenueChartTop = 34;
const revenueChartLeft = 42;
const revenueChartRight = 22;

function getRevenueChartData(revenueBars) {
  const maxTotal = Math.max(
    ...revenueBars.map((bar) => Number(bar.total || 0)),
    1
  );
  const chartWidth = revenueChartWidth - revenueChartLeft - revenueChartRight;
  const chartHeight = revenueChartBaseline - revenueChartTop;
  const divisor = Math.max(revenueBars.length - 1, 1);
  const points = revenueBars.map((bar, index) => {
    const x = revenueChartLeft + (chartWidth / divisor) * index;
    const y =
      revenueChartBaseline - (Number(bar.total || 0) / maxTotal) * chartHeight;

    return {
      ...bar,
      x,
      y
    };
  });
  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${revenueChartBaseline} L ${points[0].x} ${revenueChartBaseline} Z`
    : '';

  return { areaPath, linePath, maxTotal, points };
}

export default function OverviewPage() {
  const [overviewData, setOverviewData] = useState({
    members: [],
    schedule: [],
    trainers: [],
    stripeRevenue: {}
  });
  const [status, setStatus] = useState('loading');
  const kpis = getOverviewKpis(overviewData);
  const recentMembers = getOverviewRecentMembers(overviewData.members);
  const todayClasses = getOverviewTodayClasses(overviewData.schedule);
  const revenueBars = getOverviewRevenueBars(overviewData.stripeRevenue);
  const revenueSummary = getOverviewRevenueSummary(overviewData.stripeRevenue);
  const revenueChart = getRevenueChartData(revenueBars);

  useEffect(() => {
    let isCurrent = true;

    async function loadOverviewData() {
      try {
        const [membersResult, scheduleResult, trainersResult, revenueResult] =
          await Promise.allSettled([
            getMembers(),
            getClassSchedule(),
            getTrainers(),
            getStripeRevenueOverview()
          ]);

        if (isCurrent) {
          setOverviewData({
            members:
              membersResult.status === 'fulfilled' ? membersResult.value : [],
            schedule:
              scheduleResult.status === 'fulfilled' ? scheduleResult.value : [],
            trainers:
              trainersResult.status === 'fulfilled' ? trainersResult.value : [],
            stripeRevenue:
              revenueResult.status === 'fulfilled' ? revenueResult.value : {}
          });
          setStatus('ready');
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setStatus('error');
        }
      }
    }

    loadOverviewData();

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <section
      className='admin-content min-h-[calc(100vh_-_64px)] overflow-visible pb-5'
      id='overview'
    >
      <header className='admin-header mb-[clamp(18px,2.4vh,28px)] flex-none'>
        <div>
          <h2>Admin Panel</h2>
          <p>
            Manage members, bookings, trainers, payments, and gym operations in
            one place.
          </p>
        </div>
      </header>

      {status === 'loading' && <AdminLoadingSkeleton variant='overview' />}

      {status === 'error' && (
        <p className='admin-state-message error'>
          Overview data is unavailable. Check the API server, database, Clerk,
          and Stripe configuration.
        </p>
      )}

      {status === 'ready' && (
        <>
          <div className='admin-kpi-grid mb-[clamp(16px,2vh,22px)] flex-none gap-4'>
            {kpis.map((kpi) => (
              <article className='admin-kpi-card' key={kpi.label}>
                <div className='admin-kpi-copy'>
                  <h3>{kpi.label}</h3>
                  <p>{kpi.note}</p>
                </div>
                <strong className={kpi.tone}>{kpi.value}</strong>
              </article>
            ))}
          </div>

          <div className='grid min-h-0 min-w-0 flex-1 items-start gap-x-7 gap-y-4 [grid-template-columns:minmax(520px,1.55fr)_minmax(280px,0.85fr)] max-[1360px]:[grid-template-columns:minmax(0,1fr)_minmax(260px,0.65fr)] max-[980px]:grid-cols-1'>
            <section
              className={`${overviewCardClass} !h-[360px] max-[1360px]:col-span-full max-[980px]:col-auto`}
            >
              <div className='admin-card-header'>
                <h3>Recent Members</h3>
                <button type='button'>View all</button>
              </div>

              <div className='grid max-h-[274px] gap-4 overflow-y-auto pr-1 min-[1440px]:gap-5'>
                {recentMembers.map((member) => (
                  <div className={overviewMemberGridClass} key={member.id}>
                    <DefaultProfileAvatar
                      className='h-8 w-8'
                      imageUrl={member.imageUrl}
                      name={member.name}
                    />
                    <div className='min-w-0'>
                      <strong className='block text-[13px] text-white'>
                        {member.name}
                      </strong>
                      <small className='mt-1 block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-tight text-[#b8b8b8]'>
                        {member.email}
                      </small>
                    </div>
                    <div className={overviewMemberMetaClass}>
                      <span className='whitespace-nowrap text-xs text-[#b8b8b8]'>
                        {member.plan}
                      </span>
                      <span
                        className={`admin-status-pill ${member.status.toLowerCase()} max-[560px]:px-2 max-[560px]:py-0.5 max-[560px]:text-[10px]`}
                      >
                        {member.status}
                      </span>
                      <time className='whitespace-nowrap text-right text-xs text-[#b8b8b8] max-[560px]:text-[10px]'>
                        {member.joined}
                      </time>
                    </div>
                  </div>
                ))}

                {recentMembers.length === 0 && (
                  <p className='admin-empty-row'>
                    No members are available yet.
                  </p>
                )}
              </div>
            </section>

            <section
              className={`${overviewCardClass} !h-[360px] flex flex-col max-[1360px]:col-span-full max-[980px]:col-auto`}
            >
              <div className='flex items-center justify-between gap-3'>
                <h3>Today Classes</h3>
                <span className='rounded-full border border-[#393939] bg-[#202020] px-3 py-1 text-[11px] font-black text-[#b8b8b8]'>
                  {todayClasses.length}
                </span>
              </div>

              <div className='mt-[18px] grid min-h-0 flex-1 content-start gap-2.5 overflow-y-auto pr-1'>
                {todayClasses.map((item) => (
                  <div
                    className='grid min-h-[70px] grid-cols-[minmax(0,1fr)_54px] items-center gap-2.5 rounded-[14px] border border-[#343434] bg-[#202020] px-3 py-2.5 max-[560px]:grid-cols-[minmax(0,1fr)_auto]'
                    key={item.id}
                  >
                    <div className='min-w-0 self-center'>
                      <strong className='mb-1 block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] leading-tight text-white'>
                        {item.name}
                      </strong>
                      <time className='block overflow-hidden text-ellipsis whitespace-nowrap text-xs leading-tight text-[#b8b8b8]'>
                        {item.time}
                      </time>
                      <small className='mt-1 block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-tight text-[#b8b8b8]'>
                        {item.meta}
                      </small>
                    </div>
                    <b
                      className={
                        item.status === 'full'
                          ? 'text-right text-xs text-[#d90429]'
                          : 'text-right text-xs text-[#39e600]'
                      }
                    >
                      {item.duration}
                    </b>
                  </div>
                ))}

                {todayClasses.length === 0 && (
                  <p className='admin-empty-row'>
                    No classes are scheduled today.
                  </p>
                )}
              </div>
            </section>

            <section className={`${overviewCardClass} col-span-full`}>
              <div className='mb-3 flex items-start justify-between gap-4 max-[560px]:flex-col'>
                <div>
                  <h3 className='text-xl'>Revenue Overview</h3>
                  <p className='mb-0 mt-2 text-xs font-bold text-[#b8b8b8]'>
                    Last 12 months from paid Stripe payments.
                  </p>
                </div>
                <strong className='rounded-[14px] border border-[rgba(217,4,41,0.3)] bg-[rgba(217,4,41,0.1)] px-4 py-2 text-[15px] text-[#d90429]'>
                  {formatPaymentAmount({
                    amount: overviewData.stripeRevenue.monthlyRevenue || 0
                  })}
                </strong>
              </div>

              <div className='overflow-x-auto rounded-[18px] border border-[#393939] bg-[#1b1b1b] px-4 py-4'>
                <svg
                  aria-label='Revenue overview line chart by month'
                  className='block h-[220px] min-w-[680px] max-w-full'
                  role='img'
                  viewBox={`0 0 ${revenueChartWidth} ${revenueChartHeight}`}
                >
                  {[0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y =
                      revenueChartBaseline -
                      (revenueChartBaseline - revenueChartTop) * ratio;

                    return (
                      <line
                        key={ratio}
                        x1={revenueChartLeft}
                        x2={revenueChartWidth - revenueChartRight}
                        y1={y}
                        y2={y}
                        stroke='#303030'
                        strokeWidth='1'
                      />
                    );
                  })}

                  <path
                    d={revenueChart.areaPath}
                    fill='rgba(77,163,255,0.16)'
                  />
                  <path
                    d={revenueChart.linePath}
                    fill='none'
                    stroke='#4da3ff'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='4'
                  />

                  {revenueChart.points.map((point) => (
                    <g key={point.month}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        fill='#1b1b1b'
                        r='6'
                        stroke='#4da3ff'
                        strokeWidth='3'
                      />
                      <text
                        fill='#ffffff'
                        fontSize='11'
                        fontWeight='800'
                        textAnchor='middle'
                        x={point.x}
                        y={Math.max(point.y - 14, 18)}
                      >
                        {point.label}
                      </text>
                      <text
                        fill='#b8b8b8'
                        fontSize='11'
                        fontWeight='700'
                        textAnchor='middle'
                        x={point.x}
                        y='202'
                      >
                        {point.month}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              <div className='mt-4 grid gap-2 border-t border-[#393939] pt-3.5'>
                {revenueSummary.map(([label, value]) => (
                  <div
                    className='flex items-center justify-between'
                    key={label}
                  >
                    <span className='text-xs text-[#b8b8b8]'>{label}</span>
                    <strong className='text-[13px] text-white'>{value}</strong>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
