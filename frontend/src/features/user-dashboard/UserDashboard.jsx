import { useEffect, useState } from 'react';
import { SignedIn, SignedOut, useClerk, useUser } from '@clerk/clerk-react';
import { getStripePaymentAccess } from '../../shared/api';
import {
  clearPaidMembershipAccess,
  getSavedPaidMembershipAccess,
  hasRecentPaymentConfirmation,
  savePaidMembershipAccess
} from '../membership-flow/shared/planSelection';
import DashboardPage from './pages/dashboard/DashboardPage';
import ClassesPage from './pages/classes/ClassesPage';
import MyPlanPage from './pages/my-plan/MyPlanPage';
import PaymentsPage from './pages/payments/PaymentsPage';
import ProgressPage from './pages/progress/ProgressPage';
import SettingsPage from './pages/settings/SettingsPage';
import TrainersPage from './pages/trainers/TrainersPage';
import FitZoneLogo from '../../shared/ui/FitZoneLogo';
import DefaultProfileAvatar from '../../shared/ui/DefaultProfileAvatar';

const navItems = [
  'Dashboard',
  'Classes',
  'My Plan',
  'Trainers',
  'Progress',
  'Payments',
  'Settings'
];
const dashboardShellClass =
  'relative grid min-h-[100svh] grid-cols-1 overflow-x-clip bg-[#0d0d0d] p-3 pt-[92px] font-[Inter,Arial,sans-serif] text-white sm:p-4 sm:pt-[96px] md:p-6 md:pt-[104px] min-[981px]:pt-6 xl:h-screen xl:min-h-0 xl:grid-cols-[238px_minmax(0,1fr)] xl:overflow-hidden xl:p-8';
const mobileBarClass =
  'fixed left-3 right-3 top-3 z-12 hidden items-center justify-between gap-4 rounded-[20px] border border-[#414141] bg-[rgba(13,13,13,0.96)] p-3 shadow-[0_14px_34px_rgba(0,0,0,0.35)] backdrop-blur max-[980px]:flex sm:left-4 sm:right-4 sm:top-4 md:left-6 md:right-6 md:top-6';
const mobileMenuButtonClass =
  'hidden h-11 w-11 flex-[0_0_44px] cursor-pointer flex-col items-center justify-center gap-1.25 rounded-[14px] border border-[#414141] bg-[#252525] p-0 max-[980px]:flex';
const mobileMenuLineClass = 'block h-0.5 w-5 rounded-full bg-white';
const sidebarClass =
  'relative z-1 flex min-h-[calc(100vh_-_64px)] flex-col rounded-[34px] border border-[#414141] bg-[#181818] px-4.75 py-6.75 shadow-[0_24px_70px_rgba(0,0,0,0.32)] max-[1120px]:min-h-0 max-[980px]:fixed max-[980px]:left-0 max-[980px]:top-0 max-[980px]:z-15 max-[980px]:h-[100svh] max-[980px]:w-[min(330px,88vw)] max-[980px]:max-w-[88vw] max-[980px]:overflow-y-auto max-[980px]:rounded-l-none max-[980px]:rounded-r-3xl max-[980px]:px-4.5 max-[980px]:py-5.5 max-[980px]:transition-transform max-[980px]:duration-[180ms] xl:h-[calc(100vh_-_64px)] xl:min-h-0 xl:overflow-hidden';
const navClass =
  'mt-11.75 grid gap-2.5 max-[1120px]:mt-7 max-[1120px]:grid-cols-4 max-[980px]:mt-8 max-[980px]:grid-cols-1';
const navItemClass =
  'flex min-h-11 items-center gap-3.5 rounded-full border border-transparent px-4 text-sm font-black text-[#a7a7a7] no-underline transition hover:bg-[#252525] hover:text-white';
const mainContentClass =
  'relative z-1 min-w-0 pt-5 pl-8.5 max-[1120px]:pt-7 max-[1120px]:pl-0 max-[980px]:pt-2 xl:h-[calc(100vh_-_64px)] xl:overflow-y-auto xl:pr-1';
const authShellClass =
  'relative grid min-h-screen place-items-center bg-[#0d0d0d] p-8 font-[Inter,Arial,sans-serif] text-white max-[680px]:p-4';
const authCardClass =
  'rounded-5.5 border border-[#414141] bg-[#252525] p-8 text-center';
const authLinkClass =
  'inline-flex min-h-10.5 min-w-37.5 items-center justify-center rounded-xl bg-[#e6002e] px-5 text-[13px] font-black text-white no-underline';

function getDashboardPageFromHash() {
  if (window.location.href.endsWith('#')) {
    return 'Settings';
  }

  const page = decodeURIComponent(window.location.hash.replace('#', ''));

  if (page.startsWith('/')) {
    return 'Settings';
  }

  return navItems.includes(page) ? page : 'Dashboard';
}

function DashboardLayout({ activePage, children, membershipAccess, user }) {
  const { signOut } = useClerk();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const fullName = user?.fullName || 'Member';
  const planName = membershipAccess?.planName || 'Member';

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activePage]);

  return (
    <main className={dashboardShellClass}>
      <div className='pointer-events-none absolute -left-40 -top-27.5 h-125 w-125 rounded-full bg-[rgba(230,0,46,0.14)]'></div>
      <div className='pointer-events-none absolute -bottom-47.5 -right-30 h-107.5 w-107.5 rounded-full bg-[rgba(48,255,0,0.08)]'></div>

      <header className={mobileBarClass}>
        <a
          className='flex min-w-0 items-center gap-3 text-white no-underline'
          href='/'
        >
          <FitZoneLogo className='h-10 w-10' />
          <div className='min-w-0'>
            <strong className='block truncate text-xl leading-none'>
              FITZONE
            </strong>
            <small className='mt-1 block text-[9px] font-black text-[#e6002e]'>
              MEMBER APP
            </small>
          </div>
        </a>
        <button
          aria-controls='member-sidebar'
          aria-expanded={isMobileMenuOpen}
          aria-label='Toggle member navigation'
          className={mobileMenuButtonClass}
          onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
          type='button'
        >
          <span className={mobileMenuLineClass}></span>
          <span className={mobileMenuLineClass}></span>
          <span className={mobileMenuLineClass}></span>
        </button>
      </header>

      <button
        aria-label='Close member navigation'
        className={
          isMobileMenuOpen
            ? 'fixed inset-0 z-14 hidden cursor-pointer border-0 bg-[rgba(0,0,0,0.58)] p-0 max-[980px]:block'
            : 'hidden'
        }
        onClick={() => setIsMobileMenuOpen(false)}
        type='button'
      ></button>

      <aside
        aria-label='Member navigation'
        className={
          isMobileMenuOpen
            ? `${sidebarClass} max-[980px]:translate-x-0 max-[980px]:pointer-events-auto`
            : `${sidebarClass} max-[980px]:translate-x-[-106%] max-[980px]:pointer-events-none`
        }
        id='member-sidebar'
      >
        <a
          className='flex items-center gap-3.5 px-2 text-white no-underline max-[680px]:gap-2.5 max-[680px]:px-1'
          href='/'
        >
          <FitZoneLogo className='h-11.75 w-11.75 drop-shadow-[0_14px_14px_rgba(230,0,46,0.24)] max-[680px]:h-10 max-[680px]:w-10' />
          <div>
            <strong className='block text-[25px] leading-none max-[680px]:text-xl'>
              FITZONE
            </strong>
            <small className='mt-1.25 block text-[10px] font-black text-[#e6002e]'>
              MEMBER APP
            </small>
          </div>
        </a>

        <nav className={navClass} aria-label='Member dashboard'>
          {navItems.map((item) => {
            const isActive = item === activePage;

            return (
              <a
                className={`${navItemClass} ${isActive ? 'border-[#e6002e] bg-[rgba(230,0,46,0.1)] text-white shadow-[0_12px_28px_rgba(230,0,46,0.12)]' : ''}`}
                href={`#${encodeURIComponent(item)}`}
                key={item}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-[#e6002e]' : 'bg-[#454545]'}`}
                ></span>
                {item}
              </a>
            );
          })}
        </nav>

        <div className='mt-auto max-[1120px]:mt-7 max-[980px]:mt-8'>
          <div className='flex min-h-21 items-center gap-3.5 rounded-[24px] border border-[#414141] bg-[#252525] p-3.5 shadow-[0_16px_34px_rgba(0,0,0,0.24)]'>
            <DefaultProfileAvatar
              className='h-11.5 w-11.5'
              imageUrl={user?.imageUrl}
              name={fullName}
            />
            <div className='min-w-0'>
              <strong className='block truncate text-sm'>{fullName}</strong>
              <small className='mt-1.25 block truncate text-xs text-[#bdbdbd]'>
                {planName} Member
              </small>
            </div>
          </div>
          <button
            className='mt-3 flex min-h-11 w-full cursor-pointer items-center justify-center rounded-full border border-[#414141] bg-[#252525] px-5 text-sm font-black text-white transition hover:border-[#e6002e] hover:bg-[rgba(230,0,46,0.12)]'
            onClick={() => signOut({ redirectUrl: '/' })}
            type='button'
          >
            Logout
          </button>
        </div>
      </aside>

      <section className={mainContentClass}>{children}</section>
    </main>
  );
}

function DashboardContent({ user, membershipAccess }) {
  const [activePage, setActivePage] = useState(getDashboardPageFromHash);

  useEffect(() => {
    const updatePage = () => setActivePage(getDashboardPageFromHash());
    window.addEventListener('hashchange', updatePage);
    return () => window.removeEventListener('hashchange', updatePage);
  }, []);

  let page = <DashboardPage membershipAccess={membershipAccess} user={user} />;

  if (activePage === 'Classes') {
    page = <ClassesPage membershipAccess={membershipAccess} user={user} />;
  } else if (activePage === 'My Plan') {
    page = <MyPlanPage membershipAccess={membershipAccess} />;
  } else if (activePage === 'Trainers') {
    page = <TrainersPage membershipAccess={membershipAccess} user={user} />;
  } else if (activePage === 'Progress') {
    page = <ProgressPage user={user} />;
  } else if (activePage === 'Payments') {
    page = <PaymentsPage membershipAccess={membershipAccess} user={user} />;
  } else if (activePage === 'Settings') {
    page = <SettingsPage />;
  }

  return (
    <DashboardLayout
      activePage={activePage}
      membershipAccess={membershipAccess}
      user={user}
    >
      {page}
    </DashboardLayout>
  );
}

function DashboardState({ title, message, action = null }) {
  return (
    <main className={authShellClass}>
      <section className={authCardClass}>
        <h1 className='m-0 mb-2 text-2xl leading-none'>{title}</h1>
        <p className={`m-0 text-[#bdbdbd] ${action ? 'mb-5.5' : ''}`}>
          {message}
        </p>
        {action}
      </section>
    </main>
  );
}

function AuthenticatedDashboard() {
  const { isLoaded, user } = useUser();
  const [accessStatus, setAccessStatus] = useState('loading');
  const [membershipAccess, setMembershipAccess] = useState(null);
  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress;
  const memberName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  useEffect(() => {
    let isCurrent = true;

    async function verifyPaymentAccess() {
      if (!isLoaded) {
        return;
      }

      if (!email) {
        setAccessStatus('unpaid');
        return;
      }

      const savedAccess = getSavedPaidMembershipAccess(email);
      const recentlyPaid = hasRecentPaymentConfirmation(savedAccess, email);

      try {
        const access = await getStripePaymentAccess(email, memberName);
        if (!isCurrent) return;

        if (access.paid) {
          savePaidMembershipAccess({
            email,
            memberName,
            plan: { name: access.planName, slug: access.planSlug },
            membershipAccess: access
          });
          setMembershipAccess(access);
          setAccessStatus('paid');
        } else if (recentlyPaid) {
          setMembershipAccess({
            ...savedAccess,
            ...access,
            paid: true,
            planName: access.planName || savedAccess.planName,
            planSlug: access.planSlug || savedAccess.planSlug
          });
          setAccessStatus('paid');
        } else {
          clearPaidMembershipAccess(email);
          setMembershipAccess(null);
          setAccessStatus('unpaid');
        }
      } catch (error) {
        console.error(error);
        if (isCurrent) {
          setMembershipAccess(savedAccess);
          setAccessStatus(savedAccess?.paid ? 'paid' : 'error');
        }
      }
    }

    verifyPaymentAccess();
    return () => {
      isCurrent = false;
    };
  }, [email, isLoaded, memberName]);

  if (accessStatus === 'loading') {
    return (
      <DashboardState
        title='Checking payment'
        message='Verifying your membership...'
      />
    );
  }

  if (accessStatus !== 'paid') {
    const verificationFailed = accessStatus === 'error';

    return (
      <DashboardState
        title={
          verificationFailed
            ? 'Unable to verify membership'
            : 'Payment required'
        }
        message={
          verificationFailed
            ? 'We could not check your membership right now. Refresh the page to try again.'
            : 'Complete your membership payment before opening the member dashboard.'
        }
        action={
          <a
            className={authLinkClass}
            href={verificationFailed ? '/dashboard' : '/choose-plan'}
          >
            {verificationFailed ? 'Try again' : 'Choose a plan'}
          </a>
        }
      />
    );
  }

  return <DashboardContent membershipAccess={membershipAccess} user={user} />;
}

export default function UserDashboard({ clerkEnabled }) {
  if (!clerkEnabled) {
    return (
      <DashboardState
        title='Connect Clerk'
        message='Clerk is required to match members to membership payments.'
        action={
          <a className={authLinkClass} href='/login'>
            Back to login
          </a>
        }
      />
    );
  }

  return (
    <>
      <SignedIn>
        <AuthenticatedDashboard />
      </SignedIn>
      <SignedOut>
        <DashboardState
          title='Login required'
          message='Sign in to view your FitZone dashboard.'
          action={
            <a className={authLinkClass} href='/login'>
              Go to login
            </a>
          }
        />
      </SignedOut>
    </>
  );
}
