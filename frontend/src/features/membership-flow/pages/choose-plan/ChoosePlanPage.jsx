import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { getMembershipPlans } from '../../../../shared/api';
import {
  getPlanCtaLabel,
  saveSelectedPlan
} from '../../shared/planSelection';
import FitZoneLogo from '../../../../shared/ui/FitZoneLogo';
import '../../../home/Home.css';

const pageContent = 'relative z-[1] mx-auto max-w-[1140px]';
const flowNav = `${pageContent} flex min-h-[66px] items-center justify-between rounded-[22px] border border-[#3a3a3a] bg-[#181818] py-3 pl-6 pr-7 max-[640px]:items-start max-[640px]:flex-col max-[640px]:gap-3.5 max-[640px]:p-[18px]`;
const flowBrand = 'inline-flex items-center gap-3.5 text-white no-underline';
function PlanCard({ plan, onChoose }) {
  const badge = plan.popular ? 'MOST POPULAR' : '';

  return (
    <article className={`home-plan-card ${plan.popular ? 'home-plan-popular' : ''}`}>
      {badge && (
        <span className='rounded-full bg-[#e6002e] px-4 py-1.5 text-xs font-bold text-white'>
          {badge}
        </span>
      )}
      <h3 className='mb-2.5 mt-0'>
        {plan.name}
      </h3>
      <p className='mb-3.5 mt-0'>
        {plan.desc}
      </p>
      <h4 className='mb-6 mt-0 text-[38px] leading-none text-[#1d2939]'>
        {plan.price}<small className='ml-3.5 text-xs text-[#667085]'>/month</small>
      </h4>
      <h5 className='mb-3 mt-0'>What you get</h5>
      <ul className='mb-6 mt-0 grid list-none gap-[11px] p-0'>
        {(plan.features || []).map((feature) => (
          <li
            className='flex items-center text-[#475467]'
            key={feature}
          >
            <span className='grid h-5 w-5 flex-[0_0_20px] place-items-center rounded-full bg-[#e6002e] text-xs font-black text-white'>
              ✓
            </span>
            {feature}
          </li>
        ))}
      </ul>

      <button
        className='mt-auto min-h-11 w-full cursor-pointer rounded-lg bg-[#e6002e] px-5 font-bold text-white hover:bg-[#8f1d14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b42318]'
        onClick={() => onChoose(plan)}
        type='button'
      >
        {getPlanCtaLabel(plan)}
      </button>
    </article>
  );
}

function ChoosePlanContent() {
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let isCurrent = true;

    async function loadPlans() {
      try {
        const nextPlans = await getMembershipPlans();

        if (isCurrent) {
          setPlans(nextPlans.filter((plan) => plan.active !== false));
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
    <main className='fitzone-ui relative min-h-screen overflow-x-hidden overflow-y-auto bg-[#f8f9fb] p-4 font-[Inter,Arial,sans-serif] text-[#1d2939] sm:px-6 sm:pb-6 sm:pt-7 lg:px-[clamp(28px,5vw,70px)] lg:pt-[38px]'>
      <div className='pointer-events-none absolute -left-[130px] -top-[100px] h-[470px] w-[470px] rounded-full bg-[rgba(230,0,46,0.16)]'></div>
      <div className='pointer-events-none absolute -bottom-[140px] -right-5 h-[430px] w-[430px] rounded-full bg-[rgba(255,213,79,0.09)]'></div>

      <header className={flowNav}>
        <a className={flowBrand} href='/'>
          <FitZoneLogo className='h-10 w-10' />
          <strong className='text-[23px] tracking-normal'>FITZONE</strong>
        </a>
        <p className='m-0 text-[13px] font-black text-[#bdbdbd]'>
          Step 2: Choose your membership plan
        </p>
      </header>

      <section
        className={`${pageContent} py-4 pb-[18px] text-center max-[640px]:py-7 max-[640px]:text-left`}
      >
        <span className='mb-[3px] block text-[13px] font-black uppercase text-[#e6002e]'>
          Membership Setup
        </span>
        <h1 className='mb-1 mt-0 text-3xl leading-[1.05] tracking-normal sm:text-[42px] lg:text-[clamp(42px,4.4vw,48px)]'>
          Choose Your Plan
        </h1>
        <p className='m-0 text-[17px] text-[#bdbdbd]'>
          Select the plan that matches your fitness goal. You can upgrade
          anytime.
        </p>
      </section>

      {status === 'loading' && (
        <p
          className={`${pageContent} py-20 text-center text-[17px] text-[#bdbdbd]`}
        >
          Loading membership plans...
        </p>
      )}
      {status === 'error' && (
        <p
          className={`${pageContent} py-20 text-center text-[17px] text-[#ff8ea2]`}
        >
          Membership plans are unavailable right now.
        </p>
      )}
      {status === 'ready' && plans.length === 0 && (
        <p
          className={`${pageContent} py-20 text-center text-[17px] text-[#bdbdbd]`}
        >
          No active membership plans are available.
        </p>
      )}

      {status === 'ready' && plans.length > 0 && (
        <section
          className={`${pageContent} home-page home-plan-grid mt-5 pb-6`}
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

function RedirectToLogin() {
  useEffect(() => {
    window.location.replace('/login');
  }, []);
  return null;
}

function AuthenticatedChoosePlanPage() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <main className='fitzone-ui grid min-h-screen place-items-center p-6'>
        <p role='status' className='text-[#475467]'>Checking your session...</p>
      </main>
    );
  }

  if (!isSignedIn) return <RedirectToLogin />;

  return <ChoosePlanContent />;
}

function ChoosePlanPage({ clerkEnabled }) {
  return clerkEnabled ? <AuthenticatedChoosePlanPage /> : <RedirectToLogin />;
}

export default ChoosePlanPage;
