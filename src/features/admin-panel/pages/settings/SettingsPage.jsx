import { useEffect, useState } from "react";
import { getSiteSettings, updateSiteSettings } from "../../../../shared/api";
import { applyAdminSettingsValue, getAdminSettingsRows } from "../../adminPanelUtils";
import "./SettingsPage.css";

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [status, setStatus] = useState("loading");
  const [settingsForm, setSettingsForm] = useState(null);
  const [formStatus, setFormStatus] = useState("idle");
  const [formError, setFormError] = useState("");
  const rows = getAdminSettingsRows(settings);

  function openSettingsForm(row) {
    setSettingsForm({
      key: row.key,
      label: row.label,
      value: row.value,
      multiline: row.multiline,
      inputType: row.inputType || "text",
    });
    setFormStatus("idle");
    setFormError("");
  }

  function closeSettingsForm() {
    if (formStatus === "saving") {
      return;
    }

    setSettingsForm(null);
    setFormError("");
  }

  function updateSettingsFormValue(value) {
    setSettingsForm((currentForm) => currentForm ? { ...currentForm, value } : currentForm);
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
      setFormStatus("saving");
      setFormError("");

      const nextSettings = applyAdminSettingsValue(settings, settingsForm.key, settingsForm.value);
      const savedSettings = await updateSiteSettings(nextSettings);

      setSettings(savedSettings);
      setSettingsForm(null);
      setFormStatus("idle");
    } catch (error) {
      console.error("Unable to save admin settings", error);
      setFormError(error.message || "Unable to save setting.");
      setFormStatus("idle");
    }
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadSettings() {
      try {
        const siteSettings = await getSiteSettings();

        if (isCurrent) {
          setSettings(siteSettings || {});
          setStatus("ready");
        }
      } catch (error) {
        console.error("Unable to load admin settings", error);
        if (isCurrent) {
          setStatus("error");
        }
      }
    }

    loadSettings();

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <section className="admin-content admin-settings-page" id="settings">
      <header className="admin-header admin-settings-header">
        <div>
          <h2>Admin Settings</h2>
          <p>Control admin accounts, gym information, system settings, and security.</p>
        </div>
        <div className="admin-header-actions">
          <label className="admin-search" aria-label="Search settings">
            <input placeholder="Search..." type="search" />
          </label>
        </div>
      </header>

      {status === "error" && (
        <div className="admin-empty-state">Settings are unavailable right now.</div>
      )}

      {status !== "error" && (
        <section className="admin-settings-list" aria-busy={status === "loading"}>
          {rows.map((row) => (
            <article className="admin-settings-row" key={row.label}>
              <span>{row.label}</span>
              <strong>{row.displayValue}</strong>
              <button onClick={() => openSettingsForm(row)} type="button">Edit</button>
            </article>
          ))}
        </section>
      )}

      {settingsForm && (
        <div className="admin-modal-backdrop" role="presentation">
          <form className="admin-class-form admin-settings-form" onSubmit={saveSettingsForm}>
            <div className="admin-form-header">
              <div>
                <h3>Edit {settingsForm.label}</h3>
                <p>This updates the contact information shown on the home page.</p>
              </div>
              <button aria-label="Close settings form" onClick={closeSettingsForm} type="button">×</button>
            </div>

            <div className="admin-form-grid">
              <label className="wide">
                <span>{settingsForm.label}</span>
                {settingsForm.multiline ? (
                  <textarea
                    onChange={(event) => updateSettingsFormValue(event.target.value)}
                    rows="4"
                    value={settingsForm.value}
                  />
                ) : (
                  <input
                    onChange={(event) => updateSettingsFormValue(event.target.value)}
                    type={settingsForm.inputType}
                    value={settingsForm.value}
                  />
                )}
              </label>
            </div>

            {formError && <p className="admin-form-error">{formError}</p>}

            <div className="admin-form-actions">
              <button disabled={formStatus === "saving"} onClick={closeSettingsForm} type="button">Cancel</button>
              <button className="primary" disabled={formStatus === "saving"} type="submit">
                {formStatus === "saving" ? "Saving..." : "Save Setting"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
