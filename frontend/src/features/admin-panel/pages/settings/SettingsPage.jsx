import { useEffect, useState } from 'react';
import { getSiteSettings, updateSiteSettings } from '../../../../shared/api';
import {
  applyAdminSettingsValue,
  getAdminSettingsRows,
  getAdminSocialRows
} from '../../adminPanelUtils';
import AdminLoadingSkeleton from '../../components/AdminLoadingSkeleton';
import './SettingsPage.css';

function SettingsField({ row, onEdit }) {
  return (
    <article className='site-setting-row'>
      <div className='site-setting-copy'>
        <h4>{row.label}</h4>
        <p>{row.description}</p>
      </div>
      <div className='site-setting-value' title={row.displayValue}>
        {row.displayValue}
      </div>
      <button
        className='site-setting-edit'
        onClick={() => onEdit(row)}
        type='button'
      >
        Edit <span className='sr-only'>{row.label}</span>
      </button>
    </article>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [status, setStatus] = useState('loading');
  const [settingsForm, setSettingsForm] = useState(null);
  const [formStatus, setFormStatus] = useState('idle');
  const [formError, setFormError] = useState('');
  const rows = getAdminSettingsRows(settings);
  const socialRows = getAdminSocialRows(settings);

  function openSettingsForm(row) {
    setSettingsForm({
      key: row.key,
      label: row.label,
      value: row.value,
      multiline: row.multiline,
      inputType: row.inputType || 'text',
      optional: row.optional || false,
      domain: row.domain || ''
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

    if (!value && !settingsForm.optional) {
      setFormError(`${settingsForm.label} is required.`);
      return;
    }

    if (value && settingsForm.domain) {
      try {
        const url = new URL(value);
        const hostname = url.hostname.toLowerCase();
        const allowedDomains =
          settingsForm.key === 'social:FB'
            ? ['facebook.com', 'fb.com']
            : settingsForm.key === 'social:YT'
              ? ['youtube.com', 'youtu.be']
              : [settingsForm.domain];

        if (
          url.protocol !== 'https:' ||
          !allowedDomains.some(
            (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
          )
        ) {
          throw new Error('Invalid social link');
        }
      } catch {
        setFormError(`Enter a secure ${settingsForm.label} URL, or leave it blank.`);
        return;
      }
    }

    try {
      setFormStatus('saving');
      setFormError('');

      const nextSettings = applyAdminSettingsValue(
        settings,
        settingsForm.key,
        value
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
    <section className='admin-content admin-settings-page min-h-[calc(100vh_-_64px)]' id='settings'>
      <header className='admin-header admin-settings-header'>
        <div>
          <span className='admin-settings-eyebrow'>GYM CONFIGURATION</span>
          <h2>Settings</h2>
          <p>
            Keep your public gym information and social channels up to date.
          </p>
        </div>
      </header>

      {status === 'error' && (
        <div className='admin-empty-state'>
          Settings are unavailable right now.
        </div>
      )}

      {status === 'loading' && <AdminLoadingSkeleton variant='settings' />}

      {status === 'ready' && (
        <section className='admin-settings-layout' aria-busy={false}>
          <div className='admin-settings-stack'>
            <section className='admin-settings-card'>
              <div className='admin-settings-card-header'>
                <div>
                  <h3>Gym identity</h3>
                  <p>The name visitors see throughout FitZone.</p>
                </div>
              </div>
              <SettingsField row={rows[0]} onEdit={openSettingsForm} />
            </section>

            <section className='admin-settings-card'>
              <div className='admin-settings-card-header'>
                <div>
                  <h3>Contact &amp; location</h3>
                  <p>Details displayed in the public website footer.</p>
                </div>
              </div>
              {[rows[1], rows[3], rows[4]].map((row) => (
                <SettingsField key={row.key} row={row} onEdit={openSettingsForm} />
              ))}
            </section>

            <section className='admin-settings-card'>
              <div className='admin-settings-card-header'>
                <div>
                  <h3>Opening hours</h3>
                  <p>Help visitors know when the gym is open.</p>
                </div>
              </div>
              <SettingsField row={rows[2]} onEdit={openSettingsForm} />
            </section>
          </div>

          <section className='admin-settings-card admin-settings-social'>
            <div className='admin-settings-card-header'>
              <div>
                <h3>Social media</h3>
                <p>Add your profile URL for each platform. Only configured links appear on the home page.</p>
              </div>
            </div>
            {socialRows.map((row) => (
              <SettingsField key={row.key} row={row} onEdit={openSettingsForm} />
            ))}
            <p className='admin-settings-hint'>Use the full https:// link to your FitZone profile. Clear a field to remove its footer icon.</p>
          </section>
        </section>
      )}

      {settingsForm && (
        <div className='admin-modal-backdrop' role='presentation'>
          <form className='admin-class-form admin-settings-form' onSubmit={saveSettingsForm} role='dialog' aria-modal='true' aria-labelledby='settings-form-title'>
            <div className='admin-form-header'>
              <div>
                <h3 id='settings-form-title'>Edit {settingsForm.label}</h3>
                <p>
                  Changes to public details appear on the home page after saving.
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
                    placeholder={settingsForm.domain ? `https://www.${settingsForm.domain}/your-profile` : undefined}
                    type={settingsForm.inputType}
                    value={settingsForm.value}
                  />
                )}
                {settingsForm.optional && <small>Leave blank to hide this social link.</small>}
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
