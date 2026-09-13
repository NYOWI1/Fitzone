import { useEffect, useState } from 'react';
import { getMembers, updateMemberAttendance } from '../../../../shared/api';
import {
  filterMembers,
  filterMembersByStatus,
  formatPaymentDate,
  getMemberActivity,
  getMemberPlanBreakdown,
  getMemberStats,
  getTodayIsoDate
} from '../../adminPanelUtils';
import AdminLoadingSkeleton from '../../components/AdminLoadingSkeleton';
import DefaultProfileAvatar from '../../../../shared/ui/DefaultProfileAvatar';

const memberTableGridClass =
  'grid min-w-0 items-center gap-2.5 [grid-template-columns:minmax(170px,1.5fr)_minmax(64px,0.6fr)_minmax(76px,0.72fr)_minmax(92px,0.8fr)_minmax(42px,0.36fr)_minmax(60px,0.52fr)] max-[980px]:[grid-template-columns:minmax(0,1fr)_auto] max-[980px]:items-start max-[980px]:gap-x-3.5 max-[980px]:gap-y-2.5 max-[560px]:[grid-template-columns:minmax(0,1fr)]';
const mutedMemberCellClass =
  'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#b8b8b8] max-[980px]:flex max-[980px]:min-h-[34px] max-[980px]:items-center max-[980px]:rounded-[11px] max-[980px]:bg-[rgba(15,15,15,0.35)] max-[980px]:px-2.5';
const emptyRowClass =
  'm-0 flex min-h-16 items-center rounded-2xl border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3.5 text-[13px] font-extrabold text-[#b8b8b8]';
const filterTabClass =
  'min-h-[30px] rounded-[10px] bg-transparent px-3.5 text-xs font-extrabold text-[#b8b8b8] max-[980px]:flex-1 max-[980px]:basis-auto';
const activeFilterTabClass = `${filterTabClass} bg-[#d90429] text-white`;
const rowActionClass =
  'min-h-[34px] rounded-[11px] border border-[#393939] bg-transparent text-xs font-extrabold text-[#eaeaea] max-[980px]:col-span-full max-[980px]:w-full';
const memberAvatarToneClasses = {
  blue: 'bg-[#4da3ff]',
  green: 'bg-[#39e600]',
  red: 'bg-[#d90429]',
  yellow: 'bg-[#ffd54f]'
};
const statusPillClasses = {
  active: 'bg-[rgba(57,230,0,0.12)] text-[#39e600]',
  pending: 'bg-[rgba(255,213,79,0.14)] text-[#ffd54f]',
  expired: 'bg-[rgba(217,4,41,0.15)] text-[#ff5f78]',
  expiring: 'bg-[rgba(255,213,79,0.14)] text-[#ffd54f]'
};
const dotToneClasses = memberAvatarToneClasses;

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [status, setStatus] = useState('loading');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [attendanceForm, setAttendanceForm] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState('idle');
  const [attendanceError, setAttendanceError] = useState('');
  const statusFilteredMembers = filterMembersByStatus(members, statusFilter);
  const visibleMembers = filterMembers(statusFilteredMembers, searchTerm);
  const databaseMemberStats = getMemberStats(members);
  const databasePlanBreakdown = getMemberPlanBreakdown(members);
  const databaseMemberActivity = getMemberActivity(members);

  useEffect(() => {
    let isCurrent = true;

    async function loadMembersData() {
      try {
        const nextMembers = await getMembers();

        if (isCurrent) {
          setMembers(nextMembers);
          setStatus('ready');
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setMembers([]);
          setStatus('error');
        }
      }
    }

    loadMembersData();

    return () => {
      isCurrent = false;
    };
  }, []);

  const openAttendanceForm = (member) => {
    const today = getTodayIsoDate();
    const attendanceDate = member.attendanceDate || today;
    const todayVisits =
      member.attendanceDate === attendanceDate
        ? Number(member.todayVisits || 0)
        : 0;

    setAttendanceError('');
    setAttendanceStatus('idle');
    setAttendanceForm({
      member,
      attendanceValue: todayVisits > 0 ? 'present' : 'absent',
      attendanceDate
    });
  };

  const closeAttendanceForm = () => {
    if (attendanceStatus === 'saving') {
      return;
    }

    setAttendanceForm(null);
    setAttendanceError('');
  };

  const setAttendanceValue = (value) => {
    setAttendanceForm((currentForm) =>
      currentForm
        ? {
            ...currentForm,
            attendanceValue: value
          }
        : currentForm
    );
  };

  const setAttendanceDate = (value) => {
    setAttendanceForm((currentForm) =>
      currentForm
        ? {
            ...currentForm,
            attendanceDate: value
          }
        : currentForm
    );
  };

  const saveAttendanceForm = async (event) => {
    event.preventDefault();

    if (!attendanceForm) {
      return;
    }

    const memberId =
      attendanceForm.member.memberId || attendanceForm.member.clerkUserId;
    const todayVisits = attendanceForm.attendanceValue === 'present' ? 1 : 0;
    const currentTotalVisits = Number(attendanceForm.member.visits) || 0;
    const previousTodayVisits =
      attendanceForm.member.attendanceDate === attendanceForm.attendanceDate
        ? Number(attendanceForm.member.todayVisits || 0)
        : 0;
    const visits = Math.max(
      0,
      currentTotalVisits - previousTodayVisits + todayVisits
    );

    if (
      !memberId ||
      !['present', 'absent'].includes(attendanceForm.attendanceValue)
    ) {
      setAttendanceError('Choose present or absent.');
      return;
    }

    try {
      setAttendanceStatus('saving');
      setAttendanceError('');

      const updatedAttendance = await updateMemberAttendance({
        memberId,
        visits,
        todayVisits,
        attendanceDate: attendanceForm.attendanceDate
      });

      setMembers((currentMembers) =>
        currentMembers.map((member) =>
          (member.memberId || member.clerkUserId) === memberId
            ? {
                ...member,
                visits: updatedAttendance.visits ?? visits,
                todayVisits: updatedAttendance.todayVisits ?? todayVisits,
                attendanceDate:
                  updatedAttendance.attendanceDate ??
                  attendanceForm.attendanceDate
              }
            : member
        )
      );
      setAttendanceForm(null);
      setAttendanceStatus('idle');
    } catch (error) {
      console.error(error);
      setAttendanceStatus('idle');
      setAttendanceError(error.message || 'Unable to update attendance.');
    }
  };

  return (
    <section className='admin-content gap-0' id='members'>
      <header className='admin-header'>
        <div>
          <h2>Members</h2>
          <p>
            Review Clerk member accounts with Stripe payment status, plan
            renewals, and activity.
          </p>
        </div>

        <div className='admin-header-actions'>
          <label className='admin-search'>
            <span className='sr-only'>Search members</span>
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder='Search members...'
              type='search'
              value={searchTerm}
            />
          </label>
        </div>
      </header>

      {status === 'loading' && <AdminLoadingSkeleton />}

      {status === 'error' && (
        <p className='admin-state-message error'>
          Members are unavailable. Check CLERK_SECRET_KEY and the API server.
        </p>
      )}

      {status === 'ready' && members.length === 0 && (
        <p className='admin-state-message'>
          No Clerk members are available in the current workspace.
        </p>
      )}

      {status === 'ready' && members.length > 0 && (
        <>
          <div className='admin-kpi-grid flex-none'>
            {databaseMemberStats.map((stat) => (
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

          <div className='grid min-h-0 min-w-0 flex-1 gap-x-7 gap-y-6 [grid-template-columns:minmax(0,1.72fr)_minmax(280px,0.72fr)] max-[1360px]:grid-cols-1'>
            <section className='admin-card min-h-[430px] min-[1440px]:min-h-[520px]'>
              <div className='admin-card-header admin-table-header gap-[18px]'>
                <h3>Member Directory</h3>
                <div
                  className='flex gap-1 rounded-[14px] border border-[#393939] bg-[#2b2b2b] p-1 max-[980px]:w-full max-[980px]:overflow-x-auto'
                  aria-label='Filter members'
                >
                  {['All', 'Active', 'Pending', 'Expired', 'Expiring'].map(
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
                  className={`${memberTableGridClass} border-b border-[#393939] pb-3 text-[11px] font-extrabold uppercase text-[#b8b8b8] max-[980px]:hidden`}
                >
                  <span>Member</span>
                  <span>Plan</span>
                  <span>Status</span>
                  <span>Renewal</span>
                  <span>Visits</span>
                  <span>Attendance</span>
                </div>

                {visibleMembers.map((member) => (
                  <div
                    className={`${memberTableGridClass} min-h-16 rounded-2xl border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3 py-2.5 max-[980px]:min-h-0 max-[980px]:p-3.5`}
                    key={member.memberId || member.email}
                  >
                    <div className='flex min-w-0 items-center gap-3 max-[980px]:col-span-full'>
                      <DefaultProfileAvatar
                        className='h-11 w-11'
                        imageUrl={member.imageUrl}
                        name={member.name}
                      />
                      <div className='min-w-0'>
                        <strong className='mb-[5px] block text-[13px] text-white'>
                          {member.name}
                        </strong>
                        <small className='block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-[#b8b8b8]'>
                          {member.email}
                        </small>
                      </div>
                    </div>
                    <span className={mutedMemberCellClass}>{member.plan}</span>
                    <span
                      className={`inline-flex justify-center rounded-full px-2.5 py-[7px] text-[11px] font-black max-[980px]:min-h-[34px] max-[980px]:items-center max-[560px]:justify-center ${statusPillClasses[member.status.toLowerCase()] || statusPillClasses.pending}`}
                    >
                      {member.status}
                    </span>
                    <time className={mutedMemberCellClass}>
                      {formatPaymentDate(member.renewal)}
                    </time>
                    <b className='text-[13px] text-white max-[980px]:flex max-[980px]:min-h-[34px] max-[980px]:items-center max-[980px]:rounded-[11px] max-[980px]:bg-[rgba(15,15,15,0.35)] max-[980px]:px-2.5'>
                      {member.visits}
                    </b>
                    <button
                      aria-label={`Check attendance for ${member.name}`}
                      className={rowActionClass}
                      onClick={() => openAttendanceForm(member)}
                      type='button'
                    >
                      Check
                    </button>
                  </div>
                ))}

                {visibleMembers.length === 0 && (
                  <p className={emptyRowClass}>
                    No members match your filters.
                  </p>
                )}
              </div>
            </section>

            <aside className='grid min-h-0 grid-rows-[minmax(180px,0.8fr)_minmax(220px,1fr)] gap-6 max-[1360px]:grid-cols-2 max-[1360px]:grid-rows-none max-[980px]:grid-cols-1'>
              <section className='admin-card min-h-0'>
                <h3>Plan Breakdown</h3>
                <div className='mt-[22px] grid gap-3.5'>
                  {databasePlanBreakdown.map(([plan, count, tone]) => (
                    <div
                      className='grid min-h-12 grid-cols-[10px_1fr_auto] items-center gap-3 rounded-[15px] border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3.5'
                      key={plan}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${dotToneClasses[tone] || dotToneClasses.blue}`}
                      ></span>
                      <strong className='text-[13px] text-white'>{plan}</strong>
                      <b className='text-[13px] text-[#b8b8b8]'>{count}</b>
                    </div>
                  ))}
                </div>
              </section>

              <section className='admin-card min-h-0'>
                <h3>Member Activity</h3>
                <div className='mt-[22px] grid gap-3.5'>
                  {databaseMemberActivity.map(([label, value]) => (
                    <div
                      className='grid min-h-12 grid-cols-[1fr_auto] items-center rounded-[15px] border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3.5'
                      key={label}
                    >
                      <span className='text-[13px] text-[#b8b8b8]'>
                        {label}
                      </span>
                      <strong className='text-[13px] text-white'>
                        {value}
                      </strong>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}

      {attendanceForm && (
        <div className='admin-modal-backdrop' role='presentation'>
          <form
            className='admin-class-form admin-attendance-form'
            onSubmit={saveAttendanceForm}
          >
            <div className='admin-form-header'>
              <div>
                <h3>Check Attendance</h3>
                <p>
                  Manually correct check-ins for {attendanceForm.member.name}.
                </p>
              </div>
              <button
                aria-label='Close attendance form'
                onClick={closeAttendanceForm}
                type='button'
              >
                ×
              </button>
            </div>

            <div className='admin-attendance-member'>
              <DefaultProfileAvatar
                className='h-11 w-11'
                imageUrl={attendanceForm.member.imageUrl}
                name={attendanceForm.member.name}
              />
              <div>
                <strong>{attendanceForm.member.name}</strong>
                <small>{attendanceForm.member.email}</small>
              </div>
            </div>

            <div className='admin-attendance-controls'>
              <span>Attendance date</span>
              <input
                className='min-h-[42px] rounded-[12px] border border-[#393939] bg-[#2b2b2b] px-3 text-sm font-bold text-white outline-none focus:border-[#d90429]'
                onChange={(event) => setAttendanceDate(event.target.value)}
                type='date'
                value={attendanceForm.attendanceDate}
              />
            </div>

            <div className='admin-attendance-controls'>
              <span>Attendance status</span>
              <div
                className='admin-attendance-choice-group'
                role='group'
                aria-label='Attendance status'
              >
                <button
                  className={
                    attendanceForm.attendanceValue === 'present'
                      ? 'active present'
                      : ''
                  }
                  onClick={() => setAttendanceValue('present')}
                  type='button'
                >
                  Present
                </button>
                <button
                  className={
                    attendanceForm.attendanceValue === 'absent'
                      ? 'active absent'
                      : ''
                  }
                  onClick={() => setAttendanceValue('absent')}
                  type='button'
                >
                  Absent
                </button>
              </div>
            </div>

            {attendanceError && (
              <p className='admin-form-error'>{attendanceError}</p>
            )}

            <div className='admin-form-actions'>
              <button
                disabled={attendanceStatus === 'saving'}
                onClick={closeAttendanceForm}
                type='button'
              >
                Cancel
              </button>
              <button
                className='primary'
                disabled={attendanceStatus === 'saving'}
                type='submit'
              >
                {attendanceStatus === 'saving'
                  ? 'Saving...'
                  : 'Save Attendance'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
