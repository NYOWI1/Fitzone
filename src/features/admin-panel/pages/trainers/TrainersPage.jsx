import { useEffect, useState } from "react";
import { addTrainer, getTrainers, updateTrainer } from "../../../../shared/api";
import { attachTrainerImage } from "../../../../shared/trainers";
import { filterTrainers, getEmptyTrainerForm, getTrainerCategoryBreakdown, getTrainerFormFromRecord, getTrainerPayload, getTrainerStats, trainerImageKeys } from "../../adminPanelUtils";
import "./TrainersPage.css";

export default function TrainersPage() {
  const [trainers, setTrainers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTrainerSlug, setSelectedTrainerSlug] = useState("");
  const [trainerForm, setTrainerForm] = useState(null);
  const [trainerFormStatus, setTrainerFormStatus] = useState("idle");
  const [trainerFormError, setTrainerFormError] = useState("");
  const trainerStats = getTrainerStats(trainers);
  const visibleTrainers = filterTrainers(trainers, searchTerm);
  const categoryBreakdown = getTrainerCategoryBreakdown(trainers);
  const selectedTrainer = visibleTrainers.find((trainer) => trainer.slug === selectedTrainerSlug) || visibleTrainers[0] || trainers[0];

  useEffect(() => {
    let isCurrent = true;

    async function loadTrainersData() {
      try {
        const nextTrainers = await getTrainers();

        if (isCurrent) {
          const attachedTrainers = nextTrainers.map(attachTrainerImage);

          setTrainers(attachedTrainers);
          setSelectedTrainerSlug((currentSlug) => currentSlug || attachedTrainers[0]?.slug || "");
          setStatus("ready");
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setTrainers([]);
          setStatus("error");
        }
      }
    }

    loadTrainersData();

    return () => {
      isCurrent = false;
    };
  }, []);

  const openAddTrainerForm = () => {
    setTrainerFormError("");
    setTrainerForm({
      mode: "add",
      values: getEmptyTrainerForm(trainers.length + 1),
    });
  };

  const openEditTrainerForm = (trainer) => {
    setTrainerFormError("");
    setTrainerForm({
      mode: "edit",
      originalSlug: trainer.slug,
      values: getTrainerFormFromRecord(trainer),
    });
  };

  const updateTrainerFormValue = (field, value) => {
    setTrainerForm((currentForm) => ({
      ...currentForm,
      values: {
        ...currentForm.values,
        [field]: value,
      },
    }));
  };

  const closeTrainerForm = () => {
    if (trainerFormStatus === "saving") {
      return;
    }

    setTrainerForm(null);
    setTrainerFormError("");
  };

  const saveTrainerForm = async (event) => {
    event.preventDefault();

    if (!trainerForm) {
      return;
    }

    try {
      setTrainerFormStatus("saving");
      setTrainerFormError("");

      const trainer = getTrainerPayload(trainerForm.values);
      const nextTrainers = trainerForm.mode === "edit"
        ? await updateTrainer({ originalSlug: trainerForm.originalSlug, trainer })
        : await addTrainer({ trainer });
      const attachedTrainers = nextTrainers.map(attachTrainerImage);

      setTrainers(attachedTrainers);
      setSelectedTrainerSlug(trainer.slug);
      setTrainerForm(null);
    } catch (error) {
      console.error(error);
      setTrainerFormError(trainerForm.mode === "edit" ? "Unable to update this trainer." : "Unable to add this trainer.");
    } finally {
      setTrainerFormStatus("idle");
    }
  };

  return (
    <section className="admin-content admin-trainers-page" id="trainers">
      <header className="admin-header">
        <div>
          <h2>Trainers</h2>
          <p>Manage trainer profiles, coaching categories, specialties, and database availability.</p>
        </div>

        <div className="admin-header-actions">
          <label className="admin-search">
            <span className="sr-only">Search trainers</span>
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search trainers..."
              type="search"
              value={searchTerm}
            />
          </label>
          <button className="admin-add-button" onClick={openAddTrainerForm} type="button">+ Add Trainer</button>
        </div>
      </header>

      {status === "loading" && (
        <p className="admin-state-message">Loading trainers from database...</p>
      )}

      {status === "error" && (
        <p className="admin-state-message error">Trainers are unavailable. Start the API server and try again.</p>
      )}

      {status === "ready" && trainers.length === 0 && (
        <p className="admin-state-message">No trainers are available in the current database.</p>
      )}

      {status === "ready" && trainers.length > 0 && (
        <>
          <div className="admin-kpi-grid admin-trainer-kpi-grid">
            {trainerStats.map((stat) => (
              <article className="admin-kpi-card" key={stat.label}>
                <span className={`admin-kpi-icon ${stat.tone}`}></span>
                <div className="admin-kpi-copy">
                  <h3>{stat.label}</h3>
                  <p>{stat.note}</p>
                </div>
                <strong className={stat.tone}>{stat.value}</strong>
              </article>
            ))}
          </div>

          <div className="admin-trainers-management-grid">
            <section className="admin-card admin-trainer-directory-card">
              <div className="admin-card-header admin-table-header">
                <h3>Trainer Directory</h3>
                <div className="admin-filter-tabs" aria-label="Filter trainers">
                  <button className="active" type="button">All</button>
                  <button type="button">Active</button>
                  <button type="button">Featured</button>
                </div>
              </div>

              <div className="admin-trainer-table">
                <div className="admin-trainer-table-head">
                  <span>Trainer</span>
                  <span>Role</span>
                  <span>Category</span>
                  <span>Coach Type</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>

                {visibleTrainers.map((trainer) => (
                  <div
                    className={selectedTrainer?.slug === trainer.slug ? "admin-trainer-table-row selected" : "admin-trainer-table-row"}
                    key={trainer.slug || trainer.name}
                    onClick={() => setSelectedTrainerSlug(trainer.slug)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedTrainerSlug(trainer.slug);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="admin-table-trainer">
                      <img src={trainer.image} alt={trainer.name} />
                      <div>
                        <strong>{trainer.name}</strong>
                        <small>{trainer.badge || "Trainer"}</small>
                      </div>
                    </div>
                    <span>{trainer.role}</span>
                    <span className="admin-category-pill">{trainer.category}</span>
                    <span>{trainer.coach}</span>
                    <span className={trainer.active === false ? "admin-status-pill expired" : "admin-status-pill active"}>
                      {trainer.active === false ? "Inactive" : "Active"}
                    </span>
                    <button
                      className="admin-row-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditTrainerForm(trainer);
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                  </div>
                ))}

                {visibleTrainers.length === 0 && (
                  <p className="admin-empty-row">No trainers match your search.</p>
                )}
              </div>
            </section>

            <aside className="admin-trainers-side">
              <section className="admin-card admin-trainer-profile-card">
                <h3>Profile Preview</h3>
                <div className="admin-featured-trainer">
                  <img src={selectedTrainer.image} alt={selectedTrainer.name} />
                  <strong>{selectedTrainer.name}</strong>
                  <span>{selectedTrainer.role}</span>
                  <p>{selectedTrainer.bio}</p>
                </div>
              </section>

              <section className="admin-card admin-trainer-category-card">
                <h3>Categories</h3>
                <div className="admin-plan-list">
                  {Object.entries(categoryBreakdown).map(([category, count]) => (
                    <div className="admin-plan-row" key={category}>
                      <span className="admin-class-dot blue"></span>
                      <strong>{category}</strong>
                      <b>{count}</b>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}

      {trainerForm && (
        <div className="admin-modal-backdrop" role="presentation">
          <form className="admin-class-form admin-trainer-form" onSubmit={saveTrainerForm}>
            <div className="admin-form-header">
              <div>
                <h3>{trainerForm.mode === "edit" ? "Edit Trainer" : "Add Trainer"}</h3>
                <p>{trainerForm.mode === "edit" ? "Update this database trainer profile." : "Create a new trainer profile in the database."}</p>
              </div>
              <button aria-label="Close trainer form" onClick={closeTrainerForm} type="button">×</button>
            </div>

            <div className="admin-form-grid">
              <label>
                <span>Name</span>
                <input
                  onChange={(event) => updateTrainerFormValue("name", event.target.value)}
                  required
                  value={trainerForm.values.name}
                />
              </label>

              <label>
                <span>Slug</span>
                <input
                  onChange={(event) => updateTrainerFormValue("slug", makeSlug(event.target.value))}
                  value={trainerForm.values.slug}
                />
              </label>

              <label>
                <span>Role</span>
                <input
                  onChange={(event) => updateTrainerFormValue("role", event.target.value)}
                  required
                  value={trainerForm.values.role}
                />
              </label>

              <label>
                <span>Coach Type</span>
                <input
                  onChange={(event) => updateTrainerFormValue("coach", event.target.value)}
                  required
                  value={trainerForm.values.coach}
                />
              </label>

              <label>
                <span>Category</span>
                <input
                  onChange={(event) => updateTrainerFormValue("category", event.target.value)}
                  required
                  value={trainerForm.values.category}
                />
              </label>

              <label>
                <span>Image</span>
                <select
                  onChange={(event) => updateTrainerFormValue("imageKey", event.target.value)}
                  value={trainerForm.values.imageKey}
                >
                  {trainerImageKeys.map((imageKey) => (
                    <option key={imageKey} value={imageKey}>{imageKey}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Badge</span>
                <input
                  onChange={(event) => updateTrainerFormValue("badge", event.target.value)}
                  value={trainerForm.values.badge}
                />
              </label>

              <label>
                <span>Sort Order</span>
                <input
                  min="1"
                  onChange={(event) => updateTrainerFormValue("sortOrder", Number(event.target.value))}
                  required
                  type="number"
                  value={trainerForm.values.sortOrder}
                />
              </label>

              <label className="wide">
                <span>Bio</span>
                <textarea
                  onChange={(event) => updateTrainerFormValue("bio", event.target.value)}
                  required
                  rows="4"
                  value={trainerForm.values.bio}
                ></textarea>
              </label>

              <label className="wide">
                <span>Expertise</span>
                <textarea
                  onChange={(event) => updateTrainerFormValue("expertise", event.target.value)}
                  required
                  rows="3"
                  value={trainerForm.values.expertise}
                ></textarea>
              </label>

              <label className="wide">
                <span>Specialties</span>
                <input
                  onChange={(event) => updateTrainerFormValue("specialties", event.target.value)}
                  value={trainerForm.values.specialties}
                />
              </label>

              {[1, 2, 3].map((number) => (
                <div className="admin-stat-fieldset" key={number}>
                  <label>
                    <span>Stat {number}</span>
                    <input
                      onChange={(event) => updateTrainerFormValue(`statValue${number}`, event.target.value)}
                      value={trainerForm.values[`statValue${number}`]}
                    />
                  </label>
                  <label>
                    <span>Label {number}</span>
                    <input
                      onChange={(event) => updateTrainerFormValue(`statLabel${number}`, event.target.value)}
                      value={trainerForm.values[`statLabel${number}`]}
                    />
                  </label>
                </div>
              ))}

              <label className="admin-checkbox-label">
                <input
                  checked={trainerForm.values.active}
                  onChange={(event) => updateTrainerFormValue("active", event.target.checked)}
                  type="checkbox"
                />
                <span>Active trainer</span>
              </label>
            </div>

            {trainerFormError && <p className="admin-form-error">{trainerFormError}</p>}

            <div className="admin-form-actions">
              <button onClick={closeTrainerForm} type="button">Cancel</button>
              <button className="primary" disabled={trainerFormStatus === "saving"} type="submit">
                {trainerFormStatus === "saving" ? "Saving..." : "Save Trainer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
