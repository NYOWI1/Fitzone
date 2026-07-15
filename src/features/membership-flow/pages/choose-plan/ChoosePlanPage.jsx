import { useEffect, useState } from "react";
import { getMembershipPlans } from "../../../../shared/api";
import { getPlanMonthlyLabel, getPlanVariant, saveSelectedPlan } from "../../shared/planSelection";
import "./ChoosePlanPage.css";

function PlanCard({ plan, onChoose }) {
  const variant = getPlanVariant(plan);
  const badge = plan.badge || (variant === "premium" ? "ELITE" : "");

  return (
    <article className={`choose-plan-card ${variant}`}>
      {badge && <span className="choose-plan-badge">{badge}</span>}
      <h2>{plan.name}</h2>
      <p>{plan.desc}</p>
      <div className="choose-plan-price">
        <strong>{getPlanMonthlyLabel(plan).replace("฿", "")}฿</strong>
        <span>/month</span>
      </div>

      <div className="choose-plan-divider"></div>

      {plan.title && <h3>{plan.title}</h3>}
      <ul>
        {(plan.features || []).map((feature) => (
          <li key={feature}>
            <span>✓</span>
            {feature}
          </li>
        ))}
      </ul>

      <button onClick={() => onChoose(plan)} type="button">
        {variant === "standard" ? "Choose Standard" : "Get Started"}
      </button>
    </article>
  );
}

function ChoosePlanPage() {
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let isCurrent = true;

    async function loadPlans() {
      try {
        const nextPlans = await getMembershipPlans();

        if (isCurrent) {
          setPlans(nextPlans.filter((plan) => plan.active !== false));
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

    loadPlans();

    return () => {
      isCurrent = false;
    };
  }, []);

  const choosePlan = (plan) => {
    saveSelectedPlan(plan);
    window.location.href = `/payment?plan=${encodeURIComponent(plan.slug)}`;
  };

  return (
    <main className="choose-plan-page">
      <div className="choose-plan-bg choose-plan-bg-left"></div>
      <div className="choose-plan-bg choose-plan-bg-gold"></div>

      <header className="flow-nav">
        <a className="flow-brand" href="/">
          <span>F</span>
          <strong>FITZONE</strong>
        </a>
        <p>Step 2: Choose your membership plan</p>
      </header>

      <section className="choose-plan-heading">
        <span>Membership Setup</span>
        <h1>Choose Your Plan</h1>
        <p>Select the plan that matches your fitness goal. You can upgrade anytime.</p>
      </section>

      {status === "loading" && <p className="choose-plan-state">Loading membership plans...</p>}
      {status === "error" && <p className="choose-plan-state error">Membership plans are unavailable right now.</p>}
      {status === "ready" && plans.length === 0 && <p className="choose-plan-state">No active membership plans are available.</p>}

      {status === "ready" && plans.length > 0 && (
        <section className="choose-plan-grid">
          {plans.map((plan) => (
            <PlanCard key={plan.slug || plan.name} plan={plan} onChoose={choosePlan} />
          ))}
        </section>
      )}
    </main>
  );
}

export default ChoosePlanPage;
