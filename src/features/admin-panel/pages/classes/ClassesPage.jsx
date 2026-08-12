import { useEffect, useState } from 'react';
import {
  addClassScheduleItem,
  getClassSchedule,
  getTrainers,
  updateClassScheduleItem
} from '../../../../shared/api';
import {
  classCategories,
  classColors,
  filterVisibleClasses,
  getClassCount,
  getClassesStats,
  getEmptyClassForm,
  getScheduleClassesForPeriod,
  getTrainerName,
  periodFilters
} from '../../adminPanelUtils';
import AdminLoadingSkeleton from '../../components/AdminLoadingSkeleton';

const tableGridClass =
  'grid min-w-0 items-center gap-2.5 [grid-template-columns:minmax(170px,1.4fr)_minmax(98px,0.85fr)_minmax(62px,0.45fr)_minmax(94px,0.8fr)_minmax(72px,0.56fr)_minmax(70px,0.52fr)_minmax(58px,0.44fr)] max-[980px]:[grid-template-columns:minmax(0,1fr)_auto] max-[980px]:items-start max-[980px]:gap-x-3.5 max-[980px]:gap-y-2.5 max-[560px]:[grid-template-columns:minmax(0,1fr)]';
const mutedCellClass =
  'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#b8b8b8] max-[980px]:flex max-[980px]:min-h-[34px] max-[980px]:items-center max-[980px]:rounded-[11px] max-[980px]:bg-[rgba(15,15,15,0.35)] max-[980px]:px-2.5';
const emptyRowClass =
  'm-0 flex min-h-16 items-center rounded-2xl border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3.5 text-[13px] font-extrabold text-[#b8b8b8]';
const filterTabClass =
  'min-h-[30px] rounded-[10px] bg-transparent px-3.5 text-xs font-extrabold text-[#b8b8b8] max-[980px]:flex-1 max-[980px]:basis-auto';
const activeFilterTabClass = `${filterTabClass} bg-[#d90429] text-white`;
const categoryPillClass =
  'inline-flex justify-center rounded-full bg-[rgba(77,163,255,0.12)] px-2.5 py-[7px] text-[11px] font-black text-[#4da3ff] max-[980px]:min-h-[34px] max-[980px]:items-center max-[560px]:justify-center';
const rowActionClass =
  'min-h-[34px] rounded-[11px] border border-[#393939] bg-transparent text-xs font-extrabold text-[#eaeaea] max-[980px]:flex max-[980px]:items-center max-[980px]:justify-center';
const classColorClasses = {
  gray: 'bg-[#b8b8b8]',
  green: 'bg-[#39e600]',
  red: 'bg-[#d90429]',
  teal: 'bg-[#05735e]',
  yellow: 'bg-[#ffd54f]'
};

export default function ClassesPage() {
  const [schedule, setSchedule] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [status, setStatus] = useState('loading');
  const [activeDay, setActiveDay] = useState(() => new Date().getDay());
  const [activePeriod, setActivePeriod] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [classForm, setClassForm] = useState(null);
  const [formStatus, setFormStatus] = useState('idle');
  const [formError, setFormError] = useState('');
  const currentDaySchedule = schedule.find(
    (daySchedule) => daySchedule.weekday === activeDay
  );
  const visibleClasses = getScheduleClassesForPeriod(
    currentDaySchedule,
    activePeriod
  );
  const searchedClasses = filterVisibleClasses(
    visibleClasses,
    trainers,
    searchTerm
  );
  const classesStats = getClassesStats(schedule);
  const visibleCategoryCounts = visibleClasses.reduce(
    (categories, classItem) => {
      const category = classItem.category || 'Uncategorized';

      return {
        ...categories,
        [category]: (categories[category] || 0) + 1
      };
    },
    {}
  );

  useEffect(() => {
    let isCurrent = true;

    async function loadClassesPageData() {
      try {
        const [nextSchedule, nextTrainers] = await Promise.all([
          getClassSchedule(),
          getTrainers()
        ]);

        if (isCurrent) {
          setSchedule(nextSchedule);
          setTrainers(nextTrainers);
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

    loadClassesPageData();

    return () => {
      isCurrent = false;
    };
  }, []);

  const openAddClassForm = () => {
    setFormError('');
    setClassForm({
      mode: 'add',
      values: getEmptyClassForm(activeDay)
    });
  };

  const openEditClassForm = (classItem) => {
    setFormError('');
    setClassForm({
      mode: 'edit',
      original: {
        weekday: activeDay,
        period: classItem.periodKey,
        index: classItem.periodIndex
      },
      values: {
        weekday: activeDay,
        period: classItem.periodKey,
        name: classItem.name,
        time: classItem.time,
        duration: classItem.duration,
        trainerIndex: classItem.trainerIndex ?? 0,
        category: classItem.category,
        color: classItem.color || 'gray'
      }
    });
  };

  const updateClassFormValue = (field, value) => {
    setClassForm((currentForm) => ({
      ...currentForm,
      values: {
        ...currentForm.values,
        [field]: value
      }
    }));
  };

  const closeClassForm = () => {
    if (formStatus === 'saving') {
      return;
    }

    setClassForm(null);
    setFormError('');
  };

  const saveClassForm = async (event) => {
    event.preventDefault();

    if (!classForm) {
      return;
    }

    const values = classForm.values;
    const classItem = {
      name: values.name,
      time: values.time,
      duration: values.duration,
      trainerIndex: Number(values.trainerIndex),
      category: values.category,
      color: values.color
    };
    const payload = {
      weekday: Number(values.weekday),
      period: values.period,
      classItem
    };

    try {
      setFormStatus('saving');
      setFormError('');

      const nextSchedule =
        classForm.mode === 'edit'
          ? await updateClassScheduleItem({
              ...payload,
              weekday: classForm.original.weekday,
              period: classForm.original.period,
              index: classForm.original.index
            })
          : await addClassScheduleItem(payload);

      setSchedule(nextSchedule);
      setActiveDay(Number(values.weekday));
      setActivePeriod(values.period === 'morning' ? 'Morning' : 'Evening');
      setClassForm(null);
    } catch (error) {
      console.error(error);
      setFormError(
        classForm.mode === 'edit'
          ? 'Unable to update this class.'
          : 'Unable to add this class.'
      );
    } finally {
      setFormStatus('idle');
    }
  };

  return (
    <section className='admin-content gap-0' id='classes'>
      <header className='admin-header'>
        <div>
          <h2>Classes</h2>
          <p>
            Manage the weekly class schedule using the live class schedule
            database.
          </p>
        </div>

        <div className='admin-header-actions'>
          <label className='admin-search'>
            <span className='sr-only'>Search classes</span>
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder='Search classes...'
              type='search'
              value={searchTerm}
            />
          </label>
          <button
            className='admin-add-button'
            onClick={openAddClassForm}
            type='button'
          >
            + Add Class
          </button>
        </div>
      </header>

      {status === 'loading' && <AdminLoadingSkeleton />}

      {status === 'error' && (
        <p className='admin-state-message error'>
          Class schedule is unavailable. Start the API server and try again.
        </p>
      )}

      {status === 'ready' && schedule.length === 0 && (
        <p className='admin-state-message'>
          No classes are available in the current database.
        </p>
      )}

      {status === 'ready' && schedule.length > 0 && (
        <>
          <div className='admin-kpi-grid flex-none'>
            {classesStats.map((stat) => (
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
            <section className='admin-card min-h-[480px] min-[1440px]:min-h-[560px]'>
              <div className='admin-card-header admin-table-header'>
                <h3>{currentDaySchedule?.dayName || 'Classes'} Schedule</h3>
                <div
                  className='flex gap-1 rounded-[14px] border border-[#393939] bg-[#2b2b2b] p-1 max-[980px]:w-full max-[980px]:overflow-x-auto'
                  aria-label='Filter class period'
                >
                  {periodFilters.map((period) => (
                    <button
                      className={
                        period === activePeriod
                          ? activeFilterTabClass
                          : filterTabClass
                      }
                      key={period}
                      onClick={() => setActivePeriod(period)}
                      type='button'
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className='mb-[18px] grid grid-cols-7 gap-2.5 max-[980px]:grid-cols-4 max-[560px]:grid-cols-2'
                aria-label='Select schedule day'
              >
                {schedule.map((daySchedule) => (
                  <button
                    className={
                      daySchedule.weekday === activeDay
                        ? 'min-h-[58px] rounded-[14px] border border-[#d90429] bg-[#241216] p-2 text-white'
                        : 'min-h-[58px] rounded-[14px] border border-[#393939] bg-[#2b2b2b] p-2 text-white'
                    }
                    key={daySchedule.weekday}
                    onClick={() => setActiveDay(daySchedule.weekday)}
                    type='button'
                  >
                    <strong className='mb-[5px] block text-[13px]'>
                      {daySchedule.dayName.slice(0, 3)}
                    </strong>
                    <span className='block text-[10px] font-extrabold text-[#b8b8b8]'>
                      {getClassCount(daySchedule)} classes
                    </span>
                  </button>
                ))}
              </div>

              <div className='grid min-w-0 gap-2.5'>
                <div
                  className={`${tableGridClass} border-b border-[#393939] pb-3 text-[11px] font-extrabold uppercase text-[#b8b8b8] max-[980px]:hidden`}
                >
                  <span>Class</span>
                  <span>Time</span>
                  <span>Duration</span>
                  <span>Trainer</span>
                  <span>Category</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>

                {searchedClasses.map((classItem, index) => (
                  <div
                    className={`${tableGridClass} min-h-16 rounded-2xl border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3 py-2.5 max-[980px]:min-h-0 max-[980px]:p-3.5`}
                    key={`${classItem.name}-${classItem.time}-${index}`}
                  >
                    <div className='flex min-w-0 items-center gap-3 max-[980px]:col-span-full'>
                      <span
                        className={`h-8 w-8 flex-[0_0_32px] rounded-full ${classColorClasses[classItem.color] || classColorClasses.gray}`}
                      ></span>
                      <div className='min-w-0'>
                        <strong className='mb-[5px] block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-white'>
                          {classItem.name}
                        </strong>
                        <small className='block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#b8b8b8]'>
                          {classItem.period}
                        </small>
                      </div>
                    </div>
                    <time className={mutedCellClass}>{classItem.time}</time>
                    <span className={mutedCellClass}>{classItem.duration}</span>
                    <span className={mutedCellClass}>
                      {getTrainerName(
                        trainers,
                        classItem.trainerIndex ?? index
                      )}
                    </span>
                    <span className={categoryPillClass}>
                      {classItem.category}
                    </span>
                    <span className='admin-status-pill active'>Active</span>
                    <button
                      className={rowActionClass}
                      onClick={() => openEditClassForm(classItem)}
                      type='button'
                    >
                      Edit
                    </button>
                  </div>
                ))}

                {searchedClasses.length === 0 && (
                  <p className={emptyRowClass}>No classes match your search.</p>
                )}
              </div>
            </section>

            <aside className='grid min-h-0 grid-rows-[minmax(220px,0.8fr)_minmax(260px,1fr)] gap-6 max-[1360px]:grid-cols-2 max-[1360px]:grid-rows-none max-[980px]:grid-cols-1'>
              <section className='admin-card min-h-0'>
                <h3>Selected Day</h3>
                <div className='mt-[22px] grid gap-3'>
                  <div className='flex min-h-12 items-center justify-between rounded-[15px] border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3.5'>
                    <span className='text-[13px] text-[#b8b8b8]'>Day</span>
                    <strong className='text-[13px] text-white'>
                      {currentDaySchedule?.dayName}
                    </strong>
                  </div>
                  <div className='flex min-h-12 items-center justify-between rounded-[15px] border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3.5'>
                    <span className='text-[13px] text-[#b8b8b8]'>Morning</span>
                    <strong className='text-[13px] text-white'>
                      {currentDaySchedule?.morning?.length || 0}
                    </strong>
                  </div>
                  <div className='flex min-h-12 items-center justify-between rounded-[15px] border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3.5'>
                    <span className='text-[13px] text-[#b8b8b8]'>Evening</span>
                    <strong className='text-[13px] text-white'>
                      {currentDaySchedule?.evening?.length || 0}
                    </strong>
                  </div>
                  <div className='flex min-h-12 items-center justify-between rounded-[15px] border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3.5'>
                    <span className='text-[13px] text-[#b8b8b8]'>Total</span>
                    <strong className='text-[13px] text-white'>
                      {getClassCount(currentDaySchedule)}
                    </strong>
                  </div>
                </div>
              </section>

              <section className='admin-card min-h-0'>
                <h3>Categories</h3>
                <div className='mt-[22px] grid gap-3.5'>
                  {Object.entries(visibleCategoryCounts).map(
                    ([category, count]) => (
                      <div
                        className='grid min-h-12 grid-cols-[10px_1fr_auto] items-center gap-3 rounded-[15px] border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3.5'
                        key={category}
                      >
                        <span className='admin-class-dot blue'></span>
                        <strong className='text-[13px] text-white'>
                          {category}
                        </strong>
                        <b className='text-[13px] text-[#b8b8b8]'>{count}</b>
                      </div>
                    )
                  )}

                  {Object.keys(visibleCategoryCounts).length === 0 && (
                    <p className={emptyRowClass}>
                      No categories for this view.
                    </p>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}

      {classForm && (
        <div className='admin-modal-backdrop' role='presentation'>
          <form className='admin-class-form' onSubmit={saveClassForm}>
            <div className='admin-form-header'>
              <div>
                <h3>
                  {classForm.mode === 'edit' ? 'Edit Class' : 'Add Class'}
                </h3>
                <p>
                  {classForm.mode === 'edit'
                    ? 'Update this database schedule item.'
                    : 'Create a new class in the weekly schedule.'}
                </p>
              </div>
              <button
                aria-label='Close class form'
                onClick={closeClassForm}
                type='button'
              >
                ×
              </button>
            </div>

            <div className='admin-form-grid'>
              <label>
                <span>Day</span>
                <select
                  disabled={classForm.mode === 'edit'}
                  onChange={(event) =>
                    updateClassFormValue('weekday', Number(event.target.value))
                  }
                  value={classForm.values.weekday}
                >
                  {schedule.map((daySchedule) => (
                    <option
                      key={daySchedule.weekday}
                      value={daySchedule.weekday}
                    >
                      {daySchedule.dayName}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Period</span>
                <select
                  disabled={classForm.mode === 'edit'}
                  onChange={(event) =>
                    updateClassFormValue('period', event.target.value)
                  }
                  value={classForm.values.period}
                >
                  <option value='morning'>Morning</option>
                  <option value='evening'>Evening</option>
                </select>
              </label>

              <label className='wide'>
                <span>Class Name</span>
                <input
                  onChange={(event) =>
                    updateClassFormValue('name', event.target.value)
                  }
                  required
                  value={classForm.values.name}
                />
              </label>

              <label className='wide'>
                <span>Time</span>
                <input
                  onChange={(event) =>
                    updateClassFormValue('time', event.target.value)
                  }
                  required
                  value={classForm.values.time}
                />
              </label>

              <label>
                <span>Duration</span>
                <input
                  onChange={(event) =>
                    updateClassFormValue('duration', event.target.value)
                  }
                  required
                  value={classForm.values.duration}
                />
              </label>

              <label>
                <span>Trainer</span>
                <select
                  onChange={(event) =>
                    updateClassFormValue(
                      'trainerIndex',
                      Number(event.target.value)
                    )
                  }
                  value={classForm.values.trainerIndex}
                >
                  {(trainers.length
                    ? trainers
                    : [{ name: 'Unassigned trainer' }]
                  ).map((trainer, index) => (
                    <option
                      key={trainer.slug || trainer.name || index}
                      value={index}
                    >
                      {trainer.name || `Trainer ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Category</span>
                <select
                  onChange={(event) =>
                    updateClassFormValue('category', event.target.value)
                  }
                  required
                  value={classForm.values.category}
                >
                  {classCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Color</span>
                <select
                  onChange={(event) =>
                    updateClassFormValue('color', event.target.value)
                  }
                  value={classForm.values.color}
                >
                  {classColors.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {formError && <p className='admin-form-error'>{formError}</p>}

            <div className='admin-form-actions'>
              <button onClick={closeClassForm} type='button'>
                Cancel
              </button>
              <button
                className='primary'
                disabled={formStatus === 'saving'}
                type='submit'
              >
                {formStatus === 'saving' ? 'Saving...' : 'Save Class'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
