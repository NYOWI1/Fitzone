import { useEffect, useState } from 'react';
import { getSiteSettings, updateSiteSettings } from '../../../../shared/api';
import {
  applyAdminSettingsValue,
  getAdminSettingsRows
} from '../../adminPanelUtils';
import AdminLoadingSkeleton from '../../components/AdminLoadingSkeleton';

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [status, setStatus] = useState('loading');
  const [settingsForm, setSettingsForm] = useState(null);
  const [formStatus, setFormStatus] = useState('idle');
  const [formError, setFormError] = useState('');
  const rows = getAdminSettingsRows(settings);

  function openSettingsForm(row) {
    setSettingsForm({
      key: row.key,
      label: row.label,
      value: row.value,
      multiline: row.multiline,
      inputType: row.inputType || 'text'
    });
    setFormStatus('idle');
    setFormError('');
  }

  function closeSettingsForm() {
    if (formStatus === 'saving') {
      return;
    }

    setSettingsForm(null);
    setFormError('');
  }

  function updateSettingsFormValue(value) {
    setSettingsForm((currentForm) =>
      currentForm ? { ...currentForm, value } : currentForm
    );
  }

  async function saveSettingsForm(event) {
    event.preventDefault();

    if (!settingsForm) {
      return;
    }

    const value = settingsForm.value.trim();

    if (!value) {
      setFormError(`${settingsForm.label} is required.`);
      return;
    }

    try {
      setFormStatus('saving');
      setFormError('');

      const nextSettings = applyAdminSettingsValue(
        settings,
        settingsForm.key,
        settingsForm.value
      );
      const savedSettings = await updateSiteSettings(nextSettings);

      setSettings(savedSettings);
      setSettingsForm(null);
      setFormStatus('idle');
    } catch (error) {
      console.error('Unable to save admin settings', error);
      setFormError(error.message || 'Unable to save setting.');
      setFormStatus('idle');
    }
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadSettings() {
      try {
        const siteSettings = await getSiteSettings();

        if (isCurrent) {
          setSettings(siteSettings || {});
          setStatus('ready');
        }
      } catch (error) {
        console.error('Unable to load admin settings', error);
        if (isCurrent) {
          setStatus('error');
        }
      }
    }

    loadSettings();

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <section className='admin-content min-h-[calc(100vh_-_64px)]' id='settings'>
      <header className='admin-header mb-[clamp(36px,5.5vh,56px)]'>
        <div>
          <h2 className='text-[clamp(34px,3.3vw,44px)]'>Admin Settings</h2>
          <p>
            Control admin accounts, gym information, system settings, and
            security.
          </p>
        </div>
        <div className='admin-header-actions'>
          <label className='admin-search' aria-label='Search settings'>
            <input placeholder='Search...' type='search' />
          </label>
        </div>
      </header>

      {status === 'error' && (
        <div className='admin-empty-state'>
          Settings are unavailable right now.
        </div>
      )}

      {status === 'loading' && <AdminLoadingSkeleton variant='settings' />}

      {status === 'ready' && (
        <section
          className='grid gap-[clamp(24px,4vh,34px)]'
          aria-busy={false}
        >
          {rows.map((row) => (
            <article
              className='grid min-h-[86px] grid-cols-[minmax(140px,0.35fr)_minmax(0,1fr)_100px] items-center gap-[26px] rounded-[22px] border border-[#393939] bg-[#242424] py-5 pl-7 pr-[42px] shadow-[0_18px_34px_rgba(0,0,0,0.26)] max-[680px]:grid-cols-1 max-[680px]:gap-3 max-[680px]:p-5'
              key={row.label}
            >
              <span className='text-sm font-extrabold text-[#b8b8b8]'>
                {row.label}
              </span>
              <strong className='whitespace-pre-line text-[clamp(18px,1.5vw,20px)] leading-tight text-white'>
                {row.displayValue}
              </strong>
              <button
                className='h-10 min-w-[100px] rounded-[13px] border border-[rgba(69,69,69,0.95)] bg-[rgba(47,47,47,0.9)] text-[13px] font-extrabold text-white max-[680px]:justify-self-start'
                onClick={() => openSettingsForm(row)}
                type='button'
              >
                Edit
              </button>
            </article>
          ))}
        </section>
      )}

      {settingsForm && (
        <div className='admin-modal-backdrop' role='presentation'>
          <form className='admin-class-form' onSubmit={saveSettingsForm}>
            <div className='admin-form-header'>
              <div>
                <h3>Edit {settingsForm.label}</h3>
                <p>
                  This updates the contact information shown on the home page.
                </p>
              </div>
              <button
                aria-label='Close settings form'
                onClick={closeSettingsForm}
                type='button'
              >
                ×
              </button>
            </div>

            <div className='admin-form-grid'>
              <label className='wide'>
                <span>{settingsForm.label}</span>
                {settingsForm.multiline ? (
                  <textarea
                    onChange={(event) =>
                      updateSettingsFormValue(event.target.value)
                    }
                    rows='4'
                    value={settingsForm.value}
                  />
                ) : (
                  <input
                    onChange={(event) =>
                      updateSettingsFormValue(event.target.value)
                    }
                    type={settingsForm.inputType}
                    value={settingsForm.value}
                  />
                )}
              </label>
            </div>

            {formError && <p className='admin-form-error' role='alert'>{formError}</p>}

            <div className='admin-form-actions'>
              <button
                disabled={formStatus === 'saving'}
                onClick={closeSettingsForm}
                type='button'
              >
                Cancel
              </button>
              <button
                className='primary'
                disabled={formStatus === 'saving'}
                type='submit'
              >
                {formStatus === 'saving' ? 'Saving...' : 'Save Setting'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
