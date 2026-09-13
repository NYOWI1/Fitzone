import { useEffect, useState } from 'react';
import {
  addMembershipPlan,
  getAdminMembershipPlans,
  updateMembershipPlan
} from '../../../../shared/api';
import {
  filterPlans,
  getEmptyPlanForm,
  getPlanFormFromRecord,
  getPlanPayload,
  getPlanStats
} from '../../adminPanelUtils';
import AdminLoadingSkeleton from '../../components/AdminLoadingSkeleton';

const planTableGridClass =
  'grid min-w-0 items-center gap-2.5 [grid-template-columns:minmax(190px,1.45fr)_minmax(72px,0.55fr)_minmax(84px,0.65fr)_minmax(70px,0.5fr)_minmax(70px,0.52fr)_minmax(58px,0.44fr)] max-[980px]:[grid-template-columns:minmax(0,1fr)_auto] max-[980px]:items-start max-[980px]:gap-x-3.5 max-[980px]:gap-y-2.5 max-[560px]:[grid-template-columns:minmax(0,1fr)]';
const mutedPlanCellClass =
  'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#b8b8b8] max-[980px]:flex max-[980px]:min-h-[34px] max-[980px]:items-center max-[980px]:rounded-[11px] max-[980px]:bg-[rgba(15,15,15,0.35)] max-[980px]:px-2.5';
const filterTabClass =
  'min-h-[30px] rounded-[10px] bg-transparent px-3.5 text-xs font-extrabold text-[#b8b8b8] max-[980px]:flex-1 max-[980px]:basis-auto';
const activeFilterTabClass = `${filterTabClass} bg-[#d90429] text-white`;
const mutedPillClass =
  'inline-flex justify-center rounded-full bg-[rgba(184,184,184,0.1)] px-2.5 py-[7px] text-[11px] font-black text-[#b8b8b8] max-[980px]:min-h-[34px] max-[980px]:items-center max-[560px]:justify-center';
const categoryPillClass =
  'inline-flex justify-center rounded-full bg-[rgba(217,4,41,0.12)] px-2.5 py-[7px] text-[11px] font-black text-[#d90429] max-[980px]:min-h-[34px] max-[980px]:items-center max-[560px]:justify-center';
const rowActionClass =
  'min-h-[34px] rounded-[11px] border border-[#393939] bg-transparent text-xs font-extrabold text-[#eaeaea] max-[980px]:flex max-[980px]:items-center max-[980px]:justify-center';
const emptyRowClass =
  'm-0 flex min-h-16 items-center rounded-2xl border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3.5 text-[13px] font-extrabold text-[#b8b8b8]';

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState('loading');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlanSlug, setSelectedPlanSlug] = useState('');
  const [planForm, setPlanForm] = useState(null);
  const [planFormStatus, setPlanFormStatus] = useState('idle');
  const [planFormError, setPlanFormError] = useState('');
  const planStats = getPlanStats(plans);
  const visiblePlans = filterPlans(plans, searchTerm);
  const selectedPlan =
    visiblePlans.find((plan) => plan.slug === selectedPlanSlug) ||
    visiblePlans[0] ||
    plans[0];

  useEffect(() => {
    let isCurrent = true;

    async function loadPlansData() {
      try {
        const nextPlans = await getAdminMembershipPlans();

        if (isCurrent) {
          setPlans(nextPlans);
          setSelectedPlanSlug(
            (currentSlug) => currentSlug || nextPlans[0]?.slug || ''
          );
          setStatus('ready');
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setPlans([]);
          setStatus('error');
        }
      }
    }

    loadPlansData();

    return () => {
      isCurrent = false;
    };
  }, []);

  const openAddPlanForm = () => {
    setPlanFormError('');
    setPlanForm({
      mode: 'add',
      values: getEmptyPlanForm(plans.length + 1)
    });
  };

  const openEditPlanForm = (plan) => {
    setPlanFormError('');
    setPlanForm({
      mode: 'edit',
      originalSlug: plan.slug,
      values: getPlanFormFromRecord(plan)
    });
  };

  const updatePlanFormValue = (field, value) => {
    setPlanForm((currentForm) => ({
      ...currentForm,
      values: {
        ...currentForm.values,
        [field]: value,
        ...(field === 'popular'
          ? {
              badge: value ? 'MOST POPULAR' : ''
            }
          : {})
      }
    }));
  };

  const closePlanForm = () => {
    if (planFormStatus === 'saving') {
      return;
    }

    setPlanForm(null);
    setPlanFormError('');
  };

  const savePlanForm = async (event) => {
    event.preventDefault();

    if (!planForm) {
      return;
    }

    try {
      setPlanFormStatus('saving');
      setPlanFormError('');

      const plan = getPlanPayload(planForm.values);
      const nextPlans =
        planForm.mode === 'edit'
          ? await updateMembershipPlan({
              originalSlug: planForm.originalSlug,
              plan
            })
          : await addMembershipPlan({ plan });

      setPlans(nextPlans);
      setSelectedPlanSlug(plan.slug);
      setPlanForm(null);
    } catch (error) {
      console.error(error);
      setPlanFormError(
        planForm.mode === 'edit'
          ? 'Unable to update this plan.'
          : 'Unable to add this plan.'
      );
    } finally {
      setPlanFormStatus('idle');
    }
  };

  return (
    <section className='admin-content gap-0' id='plans'>
      <header className='admin-header'>
        <div>
          <h2>Plans</h2>
          <p>
            Manage membership plan pricing, benefits, badges, and public
            availability from the database.
          </p>
        </div>

        <div className='admin-header-actions'>
          <label className='admin-search'>
            <span className='sr-only'>Search plans</span>
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder='Search plans...'
              type='search'
              value={searchTerm}
            />
          </label>
          <button
            className='admin-add-button'
            onClick={openAddPlanForm}
            type='button'
          >
            + Add Plan
          </button>
        </div>
      </header>

      {status === 'loading' && <AdminLoadingSkeleton />}

      {status === 'error' && (
        <p className='admin-state-message error'>
          Membership plans are unavailable. Start the API server and try again.
        </p>
      )}

      {status === 'ready' && plans.length === 0 && (
        <p className='admin-state-message'>
          No membership plans are available in the current database.
        </p>
      )}

      {status === 'ready' && plans.length > 0 && (
        <>
          <div className='admin-kpi-grid flex-none'>
            {planStats.map((stat) => (
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
            <section className='admin-card min-h-[480px] min-[1440px]:min-h-[540px]'>
              <div className='admin-card-header admin-table-header'>
                <h3>Membership Plans</h3>
                <div
                  className='flex gap-1 rounded-[14px] border border-[#393939] bg-[#2b2b2b] p-1 max-[980px]:w-full max-[980px]:overflow-x-auto'
                  aria-label='Filter plans'
                >
                  <button className={activeFilterTabClass} type='button'>
                    All
                  </button>
                  <button className={filterTabClass} type='button'>
                    Popular
                  </button>
                </div>
              </div>

              <div className='grid min-w-0 gap-2.5'>
                <div
                  className={`${planTableGridClass} border-b border-[#393939] pb-3 text-[11px] font-extrabold uppercase text-[#b8b8b8] max-[980px]:hidden`}
                >
                  <span>Plan</span>
                  <span>Price</span>
                  <span>Badge</span>
                  <span>Features</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>

                {visiblePlans.map((plan) => (
                  <div
                    className={
                      selectedPlan?.slug === plan.slug
                        ? `${planTableGridClass} min-h-[76px] cursor-pointer rounded-2xl border border-[rgba(234,0,48,0.72)] bg-[rgba(48,34,38,0.82)] px-3 py-2.5 shadow-[0_0_0_1px_rgba(234,0,48,0.14)] outline-none transition max-[980px]:min-h-0 max-[980px]:p-3.5`
                        : `${planTableGridClass} min-h-[76px] cursor-pointer rounded-2xl border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3 py-2.5 transition hover:border-[rgba(234,0,48,0.72)] hover:bg-[rgba(48,34,38,0.82)] hover:shadow-[0_0_0_1px_rgba(234,0,48,0.14)] focus-visible:border-[rgba(234,0,48,0.72)] focus-visible:bg-[rgba(48,34,38,0.82)] focus-visible:shadow-[0_0_0_1px_rgba(234,0,48,0.14)] focus-visible:outline-none max-[980px]:min-h-0 max-[980px]:p-3.5`
                    }
                    key={plan.slug || plan.name}
                    onClick={() => setSelectedPlanSlug(plan.slug)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedPlanSlug(plan.slug);
                      }
                    }}
                    role='button'
                    tabIndex={0}
                  >
                    <div className='flex min-w-0 items-center gap-3 max-[980px]:col-span-full'>
                      <span
                        className={
                          plan.popular
                            ? 'h-[42px] w-[42px] flex-[0_0_42px] rounded-2xl bg-[#d90429]'
                            : 'h-[42px] w-[42px] flex-[0_0_42px] rounded-2xl bg-[#4da3ff]'
                        }
                      ></span>
                      <div className='min-w-0'>
                        <strong className='mb-[5px] block text-[13px] text-white'>
                          {plan.name}
                        </strong>
                        <small className='block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#b8b8b8]'>
                          {plan.desc}
                        </small>
                      </div>
                    </div>
                    <b className='text-sm text-white max-[980px]:flex max-[980px]:min-h-[34px] max-[980px]:items-center max-[980px]:rounded-[11px] max-[980px]:bg-[rgba(15,15,15,0.35)] max-[980px]:px-2.5'>
                      {plan.price}
                    </b>
                    <span
                      className={
                        plan.popular ? categoryPillClass : mutedPillClass
                      }
                    >
                      {plan.popular ? 'MOST POPULAR' : 'None'}
                    </span>
                    <span className={mutedPlanCellClass}>
                      {(plan.features || []).length} benefits
                    </span>
                    <span
                      className={
                        plan.active === false
                          ? 'admin-status-pill expired'
                          : 'admin-status-pill active'
                      }
                    >
                      {plan.active === false ? 'Inactive' : 'Active'}
                    </span>
                    <button
                      className={rowActionClass}
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditPlanForm(plan);
                      }}
                      type='button'
                    >
                      Edit
                    </button>
                  </div>
                ))}

                {visiblePlans.length === 0 && (
                  <p className={emptyRowClass}>No plans match your search.</p>
                )}
              </div>
            </section>

            <aside className='grid min-h-0 grid-rows-[minmax(230px,0.8fr)_minmax(260px,1fr)] gap-6 max-[1360px]:grid-cols-2 max-[1360px]:grid-rows-none max-[980px]:grid-cols-1'>
              <section className='admin-card min-h-0'>
                <h3>Plan Preview</h3>
                <div
                  className={
                    selectedPlan?.popular
                      ? 'mt-[22px] grid gap-2.5 rounded-[18px] border border-[rgba(57,57,57,0.82)] border-t-[5px] border-t-[#d90429] bg-[rgba(43,43,43,0.72)] p-[18px]'
                      : 'mt-[22px] grid gap-2.5 rounded-[18px] border border-[rgba(57,57,57,0.82)] border-t-[5px] border-t-[#4da3ff] bg-[rgba(43,43,43,0.72)] p-[18px]'
                  }
                >
                  <span
                    className={
                      selectedPlan?.popular
                        ? 'text-[11px] font-black text-[#d90429]'
                        : 'text-[11px] font-black text-[#d90429]'
                    }
                  >
                    {selectedPlan?.popular ? 'MOST POPULAR' : 'MEMBERSHIP'}
                  </span>
                  <strong className='text-[22px] text-white'>
                    {selectedPlan?.name}
                  </strong>
                  <b className='text-3xl text-white'>
                    {selectedPlan?.price}
                    <small className='ml-2 text-xs text-[#b8b8b8]'>
                      /month
                    </small>
                  </b>
                  <p className='m-0 text-xs leading-normal text-[#b8b8b8]'>
                    {selectedPlan?.desc}
                  </p>
                </div>
              </section>

              <section className='admin-card min-h-0'>
                <h3>Top Benefits</h3>
                <div className='mt-[22px] grid gap-3'>
                  {(selectedPlan?.features || []).map((feature) => (
                    <div
                      className='grid min-h-[46px] grid-cols-[22px_1fr] items-center gap-2.5 rounded-[15px] border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3'
                      key={feature}
                    >
                      <span className='flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#d90429] text-xs font-black text-white'>
                        ✓
                      </span>
                      <strong className='text-xs text-[#eaeaea]'>
                        {feature}
                      </strong>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}

      {planForm && (
        <div className='admin-modal-backdrop' role='presentation'>
          <form
            className='admin-class-form admin-plan-form'
            onSubmit={savePlanForm}
          >
            <div className='admin-form-header'>
              <div>
                <h3>{planForm.mode === 'edit' ? 'Edit Plan' : 'Add Plan'}</h3>
                <p>
                  {planForm.mode === 'edit'
                    ? 'Update this database membership plan.'
                    : 'Create a new database membership plan.'}
                </p>
              </div>
              <button
                aria-label='Close plan form'
                onClick={closePlanForm}
                type='button'
              >
                ×
              </button>
            </div>

            <div className='admin-form-grid'>
              <label>
                <span>Name</span>
                <input
                  onChange={(event) =>
                    updatePlanFormValue('name', event.target.value)
                  }
                  required
                  value={planForm.values.name}
                />
              </label>

              <label>
                <span>Slug</span>
                <input
                  onChange={(event) =>
                    updatePlanFormValue('slug', makeSlug(event.target.value))
                  }
                  value={planForm.values.slug}
                />
              </label>

              <label>
                <span>Price</span>
                <input
                  onChange={(event) =>
                    updatePlanFormValue('price', event.target.value)
                  }
                  required
                  value={planForm.values.price}
                />
              </label>

              <label>
                <span>Section Title</span>
                <input
                  onChange={(event) =>
                    updatePlanFormValue('title', event.target.value)
                  }
                  required
                  value={planForm.values.title}
                />
              </label>

              <label>
                <span>Sort Order</span>
                <input
                  min='1'
                  onChange={(event) =>
                    updatePlanFormValue('sortOrder', Number(event.target.value))
                  }
                  required
                  type='number'
                  value={planForm.values.sortOrder}
                />
              </label>

              <label className='wide'>
                <span>Description</span>
                <textarea
                  onChange={(event) =>
                    updatePlanFormValue('desc', event.target.value)
                  }
                  required
                  rows='3'
                  value={planForm.values.desc}
                ></textarea>
              </label>

              <label className='wide'>
                <span>Features</span>
                <textarea
                  onChange={(event) =>
                    updatePlanFormValue('features', event.target.value)
                  }
                  rows='4'
                  value={planForm.values.features}
                ></textarea>
              </label>

              <label className='admin-checkbox-label'>
                <input
                  checked={planForm.values.popular}
                  onChange={(event) =>
                    updatePlanFormValue('popular', event.target.checked)
                  }
                  type='checkbox'
                />
                <span>
                  {planForm.values.popular
                    ? 'Popular badge: MOST POPULAR'
                    : 'Popular plan'}
                </span>
              </label>

              <label className='admin-checkbox-label'>
                <input
                  checked={planForm.values.active}
                  onChange={(event) =>
                    updatePlanFormValue('active', event.target.checked)
                  }
                  type='checkbox'
                />
                <span>Active plan</span>
              </label>
            </div>

            {planFormError && (
              <p className='admin-form-error'>{planFormError}</p>
            )}

            <div className='admin-form-actions'>
              <button onClick={closePlanForm} type='button'>
                Cancel
              </button>
              <button
                className='primary'
                disabled={planFormStatus === 'saving'}
                type='submit'
              >
                {planFormStatus === 'saving' ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
