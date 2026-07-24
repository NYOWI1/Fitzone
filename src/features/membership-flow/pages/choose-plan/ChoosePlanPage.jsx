import { useEffect, useState } from "react";
import { getMembershipPlans } from "../../../../shared/api";
import {
  getPlanCtaLabel,
  getPlanMonthlyLabel,
  getPlanVariant,
  saveSelectedPlan,
} from "../../shared/planSelection";

const pageContent = "relative z-[1] mx-auto max-w-[1140px]";
const flowNav = `${pageContent} flex min-h-[66px] items-center justify-between rounded-[22px] border border-[#3a3a3a] bg-[#181818] py-3 pl-6 pr-7 max-[640px]:items-start max-[640px]:flex-col max-[640px]:gap-3.5 max-[640px]:p-[18px]`;
const flowBrand = "inline-flex items-center gap-3.5 text-white no-underline";
const baseCard =
  "relative flex min-h-[545px] flex-col overflow-hidden rounded-[22px] border border-[#3a3a3a] bg-[#252525] px-7 pb-6 pt-[52px] shadow-[0_24px_70px_rgba(0,0,0,0.48)] before:absolute before:left-0 before:right-0 before:top-0 before:h-[5px] before:bg-[#e6002e] max-[1020px]:min-h-0 max-[640px]:rounded-[20px] max-[640px]:px-[22px] max-[640px]:pb-[22px] max-[640px]:pt-9";

function getPlanCardClass(variant) {
  if (variant === "standard") {
    return `${baseCard} min-h-[570px] border-[3px] border-[#e6002e] bg-[#271014] pt-[66px] shadow-[0_24px_70px_rgba(230,0,46,0.18)] max-[1020px]:min-h-0`;
  }

  if (variant === "premium") {
    return `${baseCard} border-[#ffd54f] pt-[66px] before:bg-[#ffd54f]`;
  }

  return baseCard;
}

function PlanCard({ plan, onChoose }) {
  const variant = getPlanVariant(plan);
  const badge = plan.badge || (variant === "premium" ? "ELITE" : "");
  const isPremium = variant === "premium";

  return (
    <article className={getPlanCardClass(variant)}>
      {badge && (
        <span
          className={`absolute left-1/2 top-5 inline-flex min-h-[30px] min-w-[150px] -translate-x-1/2 items-center justify-center rounded-full px-[18px] text-xs font-black ${isPremium ? "bg-[#ffd54f] text-[#111]" : "bg-[#e6002e] text-white"}`}
        >
          {badge}
        </span>
      )}
      <h2 className="mb-2.5 mt-0 text-center text-[30px] tracking-normal">
        {plan.name}
      </h2>
      <p className="mx-auto mb-6 mt-0 max-w-[250px] text-center text-sm leading-[1.18] text-[#bdbdbd]">
        {plan.desc}
      </p>
      <div className="mt-0.5 flex items-baseline gap-4">
        <strong
          className={`text-[clamp(46px,4vw,50px)] leading-none ${isPremium ? "text-[#ffd54f]" : "text-white"}`}
        >
          {getPlanMonthlyLabel(plan).replace("฿", "")}฿
        </strong>
        <span className="text-[15px] text-[#bdbdbd]">/month</span>
      </div>

      <div className="my-[18px] mb-[21px] h-px bg-[#3a3a3a]"></div>

      {plan.title && <h3 className="mb-[18px] mt-0 text-sm">{plan.title}</h3>}
      <ul className="mb-7 mt-0 grid list-none gap-[17px] p-0">
        {(plan.features || []).map((feature) => (
          <li
            className="flex items-center gap-3 text-sm text-[#e4e4e4]"
            key={feature}
          >
            <span
              className={`grid h-5 w-5 flex-[0_0_20px] place-items-center rounded-full text-xs font-black ${isPremium ? "bg-[#ffd54f] text-[#111]" : "bg-[#e6002e] text-white"}`}
            >
              ✓
            </span>
            {feature}
          </li>
        ))}
      </ul>

      <button
        className={`mt-auto min-h-[49px] w-full cursor-pointer rounded-[13px] border text-[15px] font-black ${variant === "basic" ? "border-[#e6002e] bg-transparent text-white" : isPremium ? "border-[#ffd54f] bg-[#ffd54f] text-[#111]" : "border-[#e6002e] bg-[#e6002e] text-white"}`}
        onClick={() => onChoose(plan)}
        type="button"
      >
        {getPlanCtaLabel(plan)}
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
    <main className="relative min-h-screen overflow-hidden bg-[#0d0d0d] px-[clamp(28px,5vw,70px)] pb-6 pt-[38px] font-[Inter,Arial,sans-serif] text-white max-[1020px]:overflow-auto max-[640px]:p-4">
      <div className="pointer-events-none absolute -left-[130px] -top-[100px] h-[470px] w-[470px] rounded-full bg-[rgba(230,0,46,0.16)]"></div>
      <div className="pointer-events-none absolute -bottom-[140px] -right-5 h-[430px] w-[430px] rounded-full bg-[rgba(255,213,79,0.09)]"></div>

      <header className={flowNav}>
        <a className={flowBrand} href="/">
          <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#e6002e] text-[21px] font-black">
            F
          </span>
          <strong className="text-[23px] tracking-normal">FITZONE</strong>
        </a>
        <p className="m-0 text-[13px] font-black text-[#bdbdbd]">
          Step 2: Choose your membership plan
        </p>
      </header>

      <section
        className={`${pageContent} py-4 pb-[18px] text-center max-[640px]:py-7 max-[640px]:text-left`}
      >
        <span className="mb-[3px] block text-[13px] font-black uppercase text-[#e6002e]">
          Membership Setup
        </span>
        <h1 className="mb-1 mt-0 text-[clamp(42px,4.4vw,48px)] leading-[1.05] tracking-normal">
          Choose Your Plan
        </h1>
        <p className="m-0 text-[17px] text-[#bdbdbd]">
          Select the plan that matches your fitness goal. You can upgrade
          anytime.
        </p>
      </section>

      {status === "loading" && (
        <p
          className={`${pageContent} py-20 text-center text-[17px] text-[#bdbdbd]`}
        >
          Loading membership plans...
        </p>
      )}
      {status === "error" && (
        <p
          className={`${pageContent} py-20 text-center text-[17px] text-[#ff8ea2]`}
        >
          Membership plans are unavailable right now.
        </p>
      )}
      {status === "ready" && plans.length === 0 && (
        <p
          className={`${pageContent} py-20 text-center text-[17px] text-[#bdbdbd]`}
        >
          No active membership plans are available.
        </p>
      )}

      {status === "ready" && plans.length > 0 && (
        <section
          className={`${pageContent} grid grid-cols-3 items-center gap-[clamp(32px,5vw,76px)] pt-0 max-[1020px]:grid-cols-[minmax(0,520px)] max-[1020px]:justify-center`}
        >
          {plans.map((plan) => (
            <PlanCard
              key={plan.slug || plan.name}
              plan={plan}
              onChoose={choosePlan}
            />
          ))}
        </section>
      )}
    </main>
  );
}

export default ChoosePlanPage;
