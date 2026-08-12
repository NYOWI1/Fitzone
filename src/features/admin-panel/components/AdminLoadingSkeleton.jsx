function SkeletonLine({ className = '' }) {
  return <span className={`admin-skeleton-line ${className}`}></span>;
}

function KpiSkeletonCards() {
  return (
    <div className='admin-kpi-grid flex-none' aria-hidden='true'>
      {Array.from({ length: 4 }, (_, index) => (
        <article className='admin-kpi-card admin-skeleton-kpi' key={index}>
          <SkeletonLine className='admin-skeleton-icon' />
          <div className='admin-kpi-copy'>
            <SkeletonLine className='w-[72%]' />
            <SkeletonLine className='mt-2 w-[54%]' />
          </div>
          <SkeletonLine className='mt-4 h-7 w-16' />
        </article>
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 6 }) {
  return (
    <section className='admin-card min-h-120 min-[1440px]:min-h-135'>
      <div className='admin-card-header admin-table-header'>
        <SkeletonLine className='h-6 w-44' />
        <SkeletonLine className='h-10 w-64 max-[980px]:w-full' />
      </div>

      <div className='grid min-w-0 gap-2.5'>
        <SkeletonLine className='mb-1 h-4 w-full' />
        {Array.from({ length: rows }, (_, index) => (
          <div className='admin-skeleton-table-row' key={index}>
            <div className='flex min-w-0 items-center gap-3 max-[980px]:col-span-full'>
              <SkeletonLine className='h-10 w-10 flex-[0_0_40px] rounded-[14px]' />
              <div className='grid min-w-0 flex-1 gap-2'>
                <SkeletonLine className='h-4 w-[68%]' />
                <SkeletonLine className='h-3 w-[52%]' />
              </div>
            </div>
            <SkeletonLine className='h-4 w-full' />
            <SkeletonLine className='h-4 w-[82%]' />
            <SkeletonLine className='h-4 w-[70%]' />
            <SkeletonLine className='h-8 w-18 rounded-full' />
            <SkeletonLine className='h-8 w-14.5 rounded-[11px]' />
          </div>
        ))}
      </div>
    </section>
  );
}

function SidePanelSkeleton() {
  return (
    <aside className='grid min-h-0 grid-rows-[minmax(220px,0.8fr)_minmax(260px,1fr)] gap-6 max-[1360px]:grid-cols-2 max-[1360px]:grid-rows-none max-[980px]:grid-cols-1'>
      {Array.from({ length: 2 }, (_, sectionIndex) => (
        <section className='admin-card min-h-0' key={sectionIndex}>
          <SkeletonLine className='h-6 w-36' />
          <div className='mt-5.5 grid gap-3.5'>
            {Array.from({ length: 4 }, (_, rowIndex) => (
              <div className='admin-skeleton-side-row' key={rowIndex}>
                <SkeletonLine className='h-2.5 w-2.5 rounded-full' />
                <SkeletonLine className='h-4 w-[68%]' />
                <SkeletonLine className='h-4 w-8' />
              </div>
            ))}
          </div>
        </section>
      ))}
    </aside>
  );
}

function SettingsSkeleton() {
  return (
    <section className='grid gap-[clamp(24px,4vh,34px)]' aria-hidden='true'>
      {Array.from({ length: 5 }, (_, index) => (
        <article className='admin-skeleton-settings-row' key={index}>
          <SkeletonLine className='h-4 w-28' />
          <SkeletonLine className='h-6 w-[min(440px,100%)]' />
          <SkeletonLine className='h-10 w-25 rounded-[13px]' />
        </article>
      ))}
    </section>
  );
}

function OverviewSkeleton() {
  return (
    <>
      <KpiSkeletonCards />
      <div className='grid min-h-0 min-w-0 flex-1 items-start gap-x-7 gap-y-4 grid-cols-[minmax(520px,1.55fr)_minmax(280px,0.85fr)] max-[1360px]:grid-cols-[minmax(0,1fr)_minmax(260px,0.65fr)] max-[980px]:grid-cols-1'>
        <TableSkeleton rows={4} />
        <SidePanelSkeleton />
      </div>
    </>
  );
}

function TablePageSkeleton() {
  return (
    <>
      <KpiSkeletonCards />
      <div className='grid min-h-0 min-w-0 flex-1 gap-x-7 gap-y-6 grid-cols-[minmax(0,1.72fr)_minmax(280px,0.72fr)] max-[1360px]:grid-cols-1'>
        <TableSkeleton />
        <SidePanelSkeleton />
      </div>
    </>
  );
}

export default function AdminLoadingSkeleton({ variant = 'table' }) {
  return (
    <div
      className='admin-skeleton'
      aria-label='Loading admin data'
      role='status'
    >
      {variant === 'settings' ? <SettingsSkeleton /> : null}
      {variant === 'overview' ? <OverviewSkeleton /> : null}
      {variant === 'table' ? <TablePageSkeleton /> : null}
    </div>
  );
}
