import { useEffect, useState } from "react";
import { addMembershipPlan, getMembershipPlans, updateMembershipPlan } from "../../../../shared/api";
import { filterPlans, getEmptyPlanForm, getPlanFormFromRecord, getPlanPayload, getPlanStats } from "../../adminPanelUtils";
import "./PlansPage.css";

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState("loading");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlanSlug, setSelectedPlanSlug] = useState("");
  const [planForm, setPlanForm] = useState(null);
  const [planFormStatus, setPlanFormStatus] = useState("idle");
  const [planFormError, setPlanFormError] = useState("");
  const planStats = getPlanStats(plans);
  const visiblePlans = filterPlans(plans, searchTerm);
  const selectedPlan = visiblePlans.find((plan) => plan.slug === selectedPlanSlug) || visiblePlans[0] || plans[0];

  useEffect(() => {
    let isCurrent = true;

    async function loadPlansData() {
      try {
        const nextPlans = await getMembershipPlans();

        if (isCurrent) {
          setPlans(nextPlans);
          setSelectedPlanSlug((currentSlug) => currentSlug || nextPlans[0]?.slug || "");
          setStatus("ready");
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setPlans([]);
          setStatus("error");
        }
      }
    }

    loadPlansData();

    return () => {
      isCurrent = false;
    };
  }, []);

  const openAddPlanForm = () => {
    setPlanFormError("");
    setPlanForm({
      mode: "add",
      values: getEmptyPlanForm(plans.length + 1),
    });
  };

  const openEditPlanForm = (plan) => {
    setPlanFormError("");
    setPlanForm({
      mode: "edit",
      originalSlug: plan.slug,
      values: getPlanFormFromRecord(plan),
    });
  };

  const updatePlanFormValue = (field, value) => {
    setPlanForm((currentForm) => ({
      ...currentForm,
      values: {
        ...currentForm.values,
        [field]: value,
      },
    }));
  };

  const closePlanForm = () => {
    if (planFormStatus === "saving") {
      return;
    }

    setPlanForm(null);
    setPlanFormError("");
  };

  const savePlanForm = async (event) => {
    event.preventDefault();

    if (!planForm) {
      return;
    }

    try {
      setPlanFormStatus("saving");
      setPlanFormError("");

      const plan = getPlanPayload(planForm.values);
      const nextPlans = planForm.mode === "edit"
        ? await updateMembershipPlan({ originalSlug: planForm.originalSlug, plan })
        : await addMembershipPlan({ plan });

      setPlans(nextPlans);
      setSelectedPlanSlug(plan.slug);
      setPlanForm(null);
    } catch (error) {
      console.error(error);
      setPlanFormError(planForm.mode === "edit" ? "Unable to update this plan." : "Unable to add this plan.");
    } finally {
      setPlanFormStatus("idle");
    }
  };

  return (
    <section className="admin-content admin-plans-page" id="plans">
      <header className="admin-header">
        <div>
          <h2>Plans</h2>
          <p>Manage membership plan pricing, benefits, badges, and public availability from the database.</p>
        </div>

        <div className="admin-header-actions">
          <label className="admin-search">
            <span className="sr-only">Search plans</span>
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search plans..."
              type="search"
              value={searchTerm}
            />
          </label>
          <button className="admin-add-button" onClick={openAddPlanForm} type="button">+ Add Plan</button>
        </div>
      </header>

      {status === "loading" && (
        <p className="admin-state-message">Loading membership plans from database...</p>
      )}

      {status === "error" && (
        <p className="admin-state-message error">Membership plans are unavailable. Start the API server and try again.</p>
      )}

      {status === "ready" && plans.length === 0 && (
        <p className="admin-state-message">No membership plans are available in the current database.</p>
      )}

      {status === "ready" && plans.length > 0 && (
        <>
          <div className="admin-kpi-grid admin-plan-kpi-grid">
            {planStats.map((stat) => (
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

          <div className="admin-plans-management-grid">
            <section className="admin-card admin-plan-directory-card">
              <div className="admin-card-header admin-table-header">
                <h3>Membership Plans</h3>
                <div className="admin-filter-tabs" aria-label="Filter plans">
                  <button className="active" type="button">All</button>
                  <button type="button">Popular</button>
                  <button type="button">Premium</button>
                </div>
              </div>

              <div className="admin-plan-table">
                <div className="admin-plan-table-head">
                  <span>Plan</span>
                  <span>Price</span>
                  <span>Badge</span>
                  <span>Features</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>

                {visiblePlans.map((plan) => (
                  <div
                    className={selectedPlan?.slug === plan.slug ? "admin-plan-table-row selected" : "admin-plan-table-row"}
                    key={plan.slug || plan.name}
                    onClick={() => setSelectedPlanSlug(plan.slug)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedPlanSlug(plan.slug);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="admin-table-plan">
                      <span className={plan.premium ? "admin-plan-mark premium" : "admin-plan-mark"}></span>
                      <div>
                        <strong>{plan.name}</strong>
                        <small>{plan.desc}</small>
                      </div>
                    </div>
                    <b>{plan.price}</b>
                    <span className={plan.badge ? "admin-category-pill" : "admin-muted-pill"}>{plan.badge || "None"}</span>
                    <span>{(plan.features || []).length} benefits</span>
                    <span className={plan.active === false ? "admin-status-pill expired" : "admin-status-pill active"}>
                      {plan.active === false ? "Inactive" : "Active"}
                    </span>
                    <button
                      className="admin-row-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditPlanForm(plan);
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                  </div>
                ))}

                {visiblePlans.length === 0 && (
                  <p className="admin-empty-row">No plans match your search.</p>
                )}
              </div>
            </section>

            <aside className="admin-plans-side">
              <section className="admin-card admin-plan-preview-card">
                <h3>Plan Preview</h3>
                <div className={selectedPlan?.premium ? "admin-plan-preview premium" : "admin-plan-preview"}>
                  <span>{selectedPlan?.badge || "MEMBERSHIP"}</span>
                  <strong>{selectedPlan?.name}</strong>
                  <b>{selectedPlan?.price}<small>/month</small></b>
                  <p>{selectedPlan?.desc}</p>
                </div>
              </section>

              <section className="admin-card admin-plan-benefits-card">
                <h3>Top Benefits</h3>
                <div className="admin-plan-benefits-list">
                  {(selectedPlan?.features || []).map((feature) => (
                    <div key={feature}>
                      <span>✓</span>
                      <strong>{feature}</strong>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}

      {planForm && (
        <div className="admin-modal-backdrop" role="presentation">
          <form className="admin-class-form admin-plan-form" onSubmit={savePlanForm}>
            <div className="admin-form-header">
              <div>
                <h3>{planForm.mode === "edit" ? "Edit Plan" : "Add Plan"}</h3>
                <p>{planForm.mode === "edit" ? "Update this database membership plan." : "Create a new database membership plan."}</p>
              </div>
              <button aria-label="Close plan form" onClick={closePlanForm} type="button">×</button>
            </div>

            <div className="admin-form-grid">
              <label>
                <span>Name</span>
                <input
                  onChange={(event) => updatePlanFormValue("name", event.target.value)}
                  required
                  value={planForm.values.name}
                />
              </label>

              <label>
                <span>Slug</span>
                <input
                  onChange={(event) => updatePlanFormValue("slug", makeSlug(event.target.value))}
                  value={planForm.values.slug}
                />
              </label>

              <label>
                <span>Price</span>
                <input
                  onChange={(event) => updatePlanFormValue("price", event.target.value)}
                  required
                  value={planForm.values.price}
                />
              </label>

              <label>
                <span>Badge</span>
                <input
                  onChange={(event) => updatePlanFormValue("badge", event.target.value)}
                  value={planForm.values.badge}
                />
              </label>

              <label>
                <span>Section Title</span>
                <input
                  onChange={(event) => updatePlanFormValue("title", event.target.value)}
                  required
                  value={planForm.values.title}
                />
              </label>

              <label>
                <span>Sort Order</span>
                <input
                  min="1"
                  onChange={(event) => updatePlanFormValue("sortOrder", Number(event.target.value))}
                  required
                  type="number"
                  value={planForm.values.sortOrder}
                />
              </label>

              <label className="wide">
                <span>Description</span>
                <textarea
                  onChange={(event) => updatePlanFormValue("desc", event.target.value)}
                  required
                  rows="3"
                  value={planForm.values.desc}
                ></textarea>
              </label>

              <label className="wide">
                <span>Features</span>
                <textarea
                  onChange={(event) => updatePlanFormValue("features", event.target.value)}
                  rows="4"
                  value={planForm.values.features}
                ></textarea>
              </label>

              <label className="admin-checkbox-label">
                <input
                  checked={planForm.values.popular}
                  onChange={(event) => updatePlanFormValue("popular", event.target.checked)}
                  type="checkbox"
                />
                <span>Popular plan</span>
              </label>

              <label className="admin-checkbox-label">
                <input
                  checked={planForm.values.premium}
                  onChange={(event) => updatePlanFormValue("premium", event.target.checked)}
                  type="checkbox"
                />
                <span>Premium tier</span>
              </label>

              <label className="admin-checkbox-label">
                <input
                  checked={planForm.values.active}
                  onChange={(event) => updatePlanFormValue("active", event.target.checked)}
                  type="checkbox"
                />
                <span>Active plan</span>
              </label>
            </div>

            {planFormError && <p className="admin-form-error">{planFormError}</p>}

            <div className="admin-form-actions">
              <button onClick={closePlanForm} type="button">Cancel</button>
              <button className="primary" disabled={planFormStatus === "saving"} type="submit">
                {planFormStatus === "saving" ? "Saving..." : "Save Plan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
