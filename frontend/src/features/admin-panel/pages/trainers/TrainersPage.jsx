import { useEffect, useRef, useState } from 'react';
import {
  addTrainer,
  deleteTrainer,
  getTrainers,
  updateTrainer
} from '../../../../shared/api';
import { prepareTrainerPhoto } from '../../../../shared/trainers/prepareTrainerPhoto';
import { attachTrainerImage } from '../../../../shared/trainers';
import {
  filterTrainers,
  getEmptyTrainerForm,
  getTrainerCategoryBreakdown,
  getTrainerFormFromRecord,
  getTrainerPayload
} from '../../adminPanelUtils';
import AdminLoadingSkeleton from '../../components/AdminLoadingSkeleton';
import { getTrainerProfile } from '../../../trainer-detail/trainerProfileContent';
import './TrainerForm.css';

const trainerTableGridClass =
  'grid min-w-0 items-center gap-2.5 [grid-template-columns:minmax(180px,1.35fr)_minmax(106px,0.8fr)_minmax(80px,0.6fr)_minmax(104px,0.78fr)_minmax(70px,0.52fr)_minmax(58px,0.44fr)] max-[980px]:[grid-template-columns:minmax(0,1fr)_auto] max-[980px]:items-start max-[980px]:gap-x-3.5 max-[980px]:gap-y-2.5 max-[560px]:[grid-template-columns:minmax(0,1fr)]';
const mutedTrainerCellClass =
  'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#b8b8b8] max-[980px]:flex max-[980px]:min-h-[34px] max-[980px]:items-center max-[980px]:rounded-[11px] max-[980px]:bg-[rgba(15,15,15,0.35)] max-[980px]:px-2.5';
const filterTabClass =
  'min-h-[30px] rounded-[10px] bg-transparent px-3.5 text-xs font-extrabold text-[#b8b8b8] max-[980px]:flex-1 max-[980px]:basis-auto';
const activeFilterTabClass = `${filterTabClass} bg-[#d90429] text-white`;
const categoryPillClass =
  'inline-flex justify-center rounded-full bg-[rgba(217,4,41,0.12)] px-2.5 py-[7px] text-[11px] font-black text-[#d90429] max-[980px]:min-h-[34px] max-[980px]:items-center max-[560px]:justify-center';
const rowActionClass =
  'min-h-[34px] rounded-[11px] border border-[#393939] bg-transparent text-xs font-extrabold text-[#eaeaea] max-[980px]:flex max-[980px]:items-center max-[980px]:justify-center';
const emptyRowClass =
  'm-0 flex min-h-16 items-center rounded-2xl border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3.5 text-[13px] font-extrabold text-[#b8b8b8]';

export default function TrainersPage() {
  const [trainers, setTrainers] = useState([]);
  const [status, setStatus] = useState('loading');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrainerSlug, setSelectedTrainerSlug] = useState('');
  const [trainerForm, setTrainerForm] = useState(null);
  const [trainerFormStatus, setTrainerFormStatus] = useState('idle');
  const [trainerFormError, setTrainerFormError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmationRef = useRef(null);
  useEffect(() => {
    if (confirmDelete) {
      confirmationRef.current?.scrollIntoView({ block: 'nearest' });
      confirmationRef.current?.querySelector('button')?.focus();
    }
  }, [confirmDelete]);
  const visibleTrainers = filterTrainers(trainers, searchTerm);
  const categoryBreakdown = getTrainerCategoryBreakdown(trainers);
  const selectedTrainer =
    visibleTrainers.find((trainer) => trainer.slug === selectedTrainerSlug) ||
    visibleTrainers[0] ||
    trainers[0];
  const selectedProfile = selectedTrainer
    ? getTrainerProfile(selectedTrainer)
    : null;

  useEffect(() => {
    let isCurrent = true;

    async function loadTrainersData() {
      try {
        const nextTrainers = await getTrainers();

        if (isCurrent) {
          const attachedTrainers = nextTrainers.map(attachTrainerImage);

          setTrainers(attachedTrainers);
          setSelectedTrainerSlug(
            (currentSlug) => currentSlug || attachedTrainers[0]?.slug || ''
          );
          setStatus('ready');
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setTrainers([]);
          setStatus('error');
        }
      }
    }

    loadTrainersData();

    return () => {
      isCurrent = false;
    };
  }, []);

  const openAddTrainerForm = async () => {
    let allTrainers;
    try {
      allTrainers = await getTrainers({ includeDeleted: true });
    } catch (error) {
      allTrainers = trainers;
    }
    setConfirmDelete(false);
    setTrainerFormError('');
    setTrainerForm({
      mode: 'add',
      values: getEmptyTrainerForm(
        Math.max(
          0,
          ...allTrainers.map((trainer) => Number(trainer.sortOrder) || 0)
        ) + 1
      )
    });
  };

  const openEditTrainerForm = (trainer) => {
    setConfirmDelete(false);
    const profile = getTrainerProfile(trainer);
    setTrainerFormError('');
    setTrainerForm({
      mode: 'edit',
      originalSlug: trainer.slug,
      values: {
        ...getTrainerFormFromRecord(trainer),
        role: profile.role,
        coach: profile.training,
        quote: profile.quote,
        bio: profile.paragraphs.join('\n\n'),
        expertise: profile.expertise.join(', ')
      }
    });
  };

  const updateTrainerFormValue = (field, value) => {
    setTrainerForm((currentForm) => ({
      ...currentForm,
      values: {
        ...currentForm.values,
        [field]: value
      }
    }));
  };

  const closeTrainerForm = () => {
    if (trainerFormStatus !== 'idle') {
      return;
    }

    setTrainerForm(null);
    setTrainerFormError('');
    setConfirmDelete(false);
  };

  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setTrainerFormStatus('uploading');
    setTrainerFormError('');
    try {
      updateTrainerFormValue('photo', await prepareTrainerPhoto(file));
    } catch (error) {
      setTrainerFormError(error.message || 'Unable to read this photo.');
    } finally {
      setTrainerFormStatus('idle');
    }
  };

  const removeTrainer = async () => {
    if (trainerFormStatus !== 'idle' || trainerForm?.mode !== 'edit') return;
    setTrainerFormStatus('deleting');
    setTrainerFormError('');
    try {
      const nextTrainers = await deleteTrainer({
        slug: trainerForm.originalSlug
      });
      const visible = nextTrainers
        .filter((trainer) => !trainer.deleted)
        .map(attachTrainerImage);
      setTrainers(visible);
      setSelectedTrainerSlug(visible[0]?.slug || '');
      setTrainerForm(null);
      setConfirmDelete(false);
    } catch (error) {
      setTrainerFormError(error.message || 'Unable to delete trainer.');
    } finally {
      setTrainerFormStatus('idle');
    }
  };

  const saveTrainerForm = async (event) => {
    event.preventDefault();
    if (trainerFormStatus !== 'idle' || confirmDelete) return;

    if (!trainerForm) {
      return;
    }

    try {
      setTrainerFormStatus('saving');
      setTrainerFormError('');

      const trainer = getTrainerPayload(trainerForm.values);
      const nextTrainers =
        trainerForm.mode === 'edit'
          ? await updateTrainer({
              originalSlug: trainerForm.originalSlug,
              trainer
            })
          : await addTrainer({ trainer });
      const attachedTrainers = nextTrainers
        .filter((trainer) => !trainer.deleted)
        .map(attachTrainerImage);

      setTrainers(attachedTrainers);
      setSelectedTrainerSlug(trainer.slug);
      setTrainerForm(null);
    } catch (error) {
      console.error(error);
      setTrainerFormError(
        trainerForm.mode === 'edit'
          ? 'Unable to update this trainer.'
          : 'Unable to add this trainer.'
      );
    } finally {
      setTrainerFormStatus('idle');
    }
  };

  return (
    <section className='admin-content gap-0' id='trainers'>
      <header className='admin-header'>
        <div>
          <h2>Trainers</h2>
          <p>
            Manage trainer profiles, coaching categories, specialties, and
            database availability.
          </p>
        </div>

        <div className='admin-header-actions'>
          <label className='admin-search'>
            <span className='sr-only'>Search trainers</span>
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder='Search trainers...'
              type='search'
              value={searchTerm}
            />
          </label>
          <button
            className='admin-add-button'
            onClick={openAddTrainerForm}
            type='button'
          >
            + Add Trainer
          </button>
        </div>
      </header>

      {status === 'loading' && <AdminLoadingSkeleton />}

      {status === 'error' && (
        <p className='admin-state-message error'>
          Trainers are unavailable. Start the API server and try again.
        </p>
      )}

      {status === 'ready' && trainers.length === 0 && (
        <p className='admin-state-message'>
          No trainers are available in the current database.
        </p>
      )}

      {status === 'ready' && trainers.length > 0 && (
        <>
          <div className='grid min-h-0 min-w-0 flex-1 gap-x-7 gap-y-6 [grid-template-columns:minmax(0,1.72fr)_minmax(280px,0.72fr)] max-[1360px]:grid-cols-1'>
            <section className='admin-card min-h-[480px] min-[1440px]:min-h-[540px]'>
              <div className='admin-card-header admin-table-header'>
                <h3>Trainer Directory</h3>
                <div
                  className='flex gap-1 rounded-[14px] border border-[#393939] bg-[#2b2b2b] p-1 max-[980px]:w-full max-[980px]:overflow-x-auto'
                  aria-label='Filter trainers'
                >
                  <button className={activeFilterTabClass} type='button'>
                    All
                  </button>
                  <button className={filterTabClass} type='button'>
                    Active
                  </button>
                  <button className={filterTabClass} type='button'>
                    Featured
                  </button>
                </div>
              </div>

              <div className='grid min-w-0 gap-2.5'>
                <div
                  className={`${trainerTableGridClass} border-b border-[#393939] pb-3 text-[11px] font-extrabold uppercase text-[#b8b8b8] max-[980px]:hidden`}
                >
                  <span>Trainer</span>
                  <span>Role</span>
                  <span>Category</span>
                  <span>Coach Type</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>

                {visibleTrainers.map((trainer) => (
                  <div
                    className={
                      selectedTrainer?.slug === trainer.slug
                        ? `${trainerTableGridClass} min-h-[72px] cursor-pointer rounded-2xl border border-[#b42318] bg-[#fef3f2] px-3 py-2.5 shadow-[0_0_0_1px_#fecdca] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b42318] max-[980px]:min-h-0 max-[980px]:p-3.5`
                        : `${trainerTableGridClass} min-h-[72px] cursor-pointer rounded-2xl border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3 py-2.5 transition hover:border-[#fecdca] hover:!bg-[#fef3f2] focus-visible:border-[#b42318] focus-visible:!bg-[#fef3f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b42318] max-[980px]:min-h-0 max-[980px]:p-3.5`
                    }
                    key={trainer.slug || trainer.name}
                    onClick={() => setSelectedTrainerSlug(trainer.slug)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedTrainerSlug(trainer.slug);
                      }
                    }}
                    role='button'
                    tabIndex={0}
                  >
                    <div className='flex min-w-0 items-center gap-3 max-[980px]:col-span-full'>
                      <img
                        className='h-[46px] w-[46px] flex-[0_0_46px] rounded-[14px] border border-[#393939] bg-[#161616] object-cover object-top'
                        src={trainer.image}
                        alt={trainer.name}
                      />
                      <div className='min-w-0'>
                        <strong className='mb-[5px] block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-white'>
                          {trainer.name}
                        </strong>
                        <small className='block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#b8b8b8]'>
                          {trainer.badge || 'Trainer'}
                        </small>
                      </div>
                    </div>
                    <span className={mutedTrainerCellClass}>
                      {trainer.role}
                    </span>
                    <span className={categoryPillClass}>
                      {trainer.category}
                    </span>
                    <span className={mutedTrainerCellClass}>
                      {trainer.coach}
                    </span>
                    <span
                      className={
                        trainer.active === false
                          ? 'admin-status-pill expired'
                          : 'admin-status-pill active'
                      }
                    >
                      {trainer.active === false ? 'Inactive' : 'Active'}
                    </span>
                    <button
                      className={rowActionClass}
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditTrainerForm(trainer);
                      }}
                      type='button'
                    >
                      Edit
                    </button>
                  </div>
                ))}

                {visibleTrainers.length === 0 && (
                  <p className={emptyRowClass}>
                    No trainers match your search.
                  </p>
                )}
              </div>
            </section>

            <aside className='grid min-h-0 grid-rows-[minmax(300px,1fr)_minmax(220px,0.7fr)] gap-6 max-[1360px]:grid-cols-2 max-[1360px]:grid-rows-none max-[980px]:grid-cols-1'>
              <section className='admin-card min-h-0'>
                <h3>Profile Preview</h3>
                <div className='mt-[22px] grid gap-2.5'>
                  <img
                    className='aspect-[16/12] h-auto w-full rounded-[18px] border border-[#393939] bg-[#161616] object-cover object-top'
                    src={selectedTrainer.image}
                    alt={selectedTrainer.name}
                  />
                  <strong className='text-base text-white'>
                    {selectedTrainer.name}
                  </strong>
                  <span className='text-xs font-black text-[#d90429]'>
                    {selectedProfile.role}
                  </span>
                  <p className='m-0 text-xs leading-normal text-[#b8b8b8]'>
                    {selectedProfile.paragraphs.join(' ')}
                  </p>
                </div>
              </section>

              <section className='admin-card min-h-0'>
                <h3>Categories</h3>
                <div className='mt-[22px] grid gap-3.5'>
                  {Object.entries(categoryBreakdown).map(
                    ([category, count]) => (
                      <div
                        className='grid min-h-12 grid-cols-[10px_1fr_auto] items-center gap-3 rounded-[15px] border border-[rgba(57,57,57,0.82)] bg-[rgba(43,43,43,0.72)] px-3.5'
                        key={category}
                      >
                        <span className='h-2.5 w-2.5 rounded-full bg-[#4da3ff]'></span>
                        <strong className='text-[13px] text-white'>
                          {category}
                        </strong>
                        <b className='text-[13px] text-[#b8b8b8]'>{count}</b>
                      </div>
                    )
                  )}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}

      {trainerForm && (
        <div className='admin-modal-backdrop' role='presentation'>
          <form
            className='admin-class-form trainer-editor'
            onSubmit={saveTrainerForm}
            role='dialog'
            aria-modal='true'
            aria-labelledby='trainer-editor-title'
          >
            <div className='admin-form-header'>
              <div>
                <h3 id='trainer-editor-title'>
                  {trainerForm.mode === 'edit' ? 'Edit Trainer' : 'Add Trainer'}
                </h3>
                <p>
                  {trainerForm.mode === 'edit'
                    ? 'Edit the information displayed on the trainer profile.'
                    : 'Introduce a new coach to FitZone.'}
                </p>
              </div>
              <button
                aria-label='Close trainer form'
                onClick={closeTrainerForm}
                type='button'
              >
                ×
              </button>
            </div>

            <div className='admin-form-grid'>
              <div className='trainer-photo-field'>
                <img
                  src={attachTrainerImage(trainerForm.values).image}
                  alt='Trainer photo preview'
                />
                <div>
                  <strong>Trainer photo</strong>
                  <p>JPG, PNG, or WebP · up to 5 MB</p>
                  <label className='trainer-photo-upload'>
                    {trainerFormStatus === 'uploading'
                      ? 'Preparing photo...'
                      : 'Upload photo'}
                    <input
                      type='file'
                      accept='image/jpeg,image/png,image/webp'
                      disabled={trainerFormStatus !== 'idle'}
                      onChange={uploadPhoto}
                    />
                  </label>
                  {trainerForm.values.photo && (
                    <button
                      type='button'
                      disabled={trainerFormStatus !== 'idle'}
                      onClick={() => updateTrainerFormValue('photo', '')}
                    >
                      Use original photo
                    </button>
                  )}
                </div>
              </div>
              {[
                ['name', 'Trainer name'],
                ['role', 'Role / subtitle']
              ].map(([field, label]) => (
                <label key={field}>
                  <span>{label}</span>
                  <input
                    required
                    value={trainerForm.values[field]}
                    onChange={(event) =>
                      updateTrainerFormValue(field, event.target.value)
                    }
                  />
                </label>
              ))}
              <label>
                <span>Training type</span>
                <input
                  required
                  value={trainerForm.values.coach}
                  onChange={(event) =>
                    updateTrainerFormValue('coach', event.target.value)
                  }
                  placeholder='Private Training or Class Training'
                />
              </label>
              <label>
                <span>Quote</span>
                <input
                  value={trainerForm.values.quote}
                  onChange={(event) =>
                    updateTrainerFormValue('quote', event.target.value)
                  }
                  placeholder='Your coaching philosophy'
                />
              </label>
              <label className='wide'>
                <span>About the trainer</span>
                <textarea
                  required
                  rows='5'
                  value={trainerForm.values.bio}
                  onChange={(event) =>
                    updateTrainerFormValue('bio', event.target.value)
                  }
                />
                <small>Separate paragraphs with a blank line.</small>
              </label>
              <label className='wide'>
                <span>Expertise</span>
                <textarea
                  required
                  rows='2'
                  value={trainerForm.values.expertise}
                  onChange={(event) =>
                    updateTrainerFormValue('expertise', event.target.value)
                  }
                />
                <small>Separate expertise tags with commas.</small>
              </label>
              {confirmDelete && (
                <div
                  ref={confirmationRef}
                  className='trainer-delete-confirmation'
                  role='alert'
                >
                  <strong>Delete {trainerForm.values.name}?</strong>
                  <p>
                    The trainer will be removed from the directory. Historical
                    records will be preserved.
                  </p>
                  <button
                    type='button'
                    disabled={trainerFormStatus !== 'idle'}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Keep Trainer
                  </button>
                  <button
                    type='button'
                    className='danger'
                    disabled={trainerFormStatus !== 'idle'}
                    onClick={removeTrainer}
                  >
                    {trainerFormStatus === 'deleting'
                      ? 'Deleting...'
                      : 'Confirm Delete'}
                  </button>
                </div>
              )}
            </div>
            {trainerFormError && (
              <p className='admin-form-error'>{trainerFormError}</p>
            )}

            <div className='admin-form-actions'>
              {trainerForm.mode === 'edit' && (
                <button
                  className='trainer-delete-button'
                  disabled={trainerFormStatus !== 'idle' || confirmDelete}
                  type='button'
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete Trainer
                </button>
              )}
              <button onClick={closeTrainerForm} type='button'>
                Cancel
              </button>
              <button
                className='primary'
                disabled={trainerFormStatus !== 'idle' || confirmDelete}
                type='submit'
              >
                {trainerFormStatus === 'saving' ? 'Saving...' : 'Save Trainer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
