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
  'fitzone-ui relative min-h-[100svh] overflow-x-hidden bg-[#f8f9fb] font-[Inter,Arial,sans-serif] text-[#1d2939]';
const mobileBarClass =
  'fixed inset-x-0 top-0 z-12 hidden h-18 items-center justify-between gap-4 border-b border-[#e4e7ec] bg-[rgba(255,255,255,0.96)] px-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)] backdrop-blur max-[980px]:flex';
const mobileMenuButtonClass =
  'hidden h-11 w-11 flex-[0_0_44px] cursor-pointer flex-col items-center justify-center gap-1.25 rounded-lg border border-[#d0d5dd] bg-white p-0 max-[980px]:flex';
const mobileMenuLineClass = 'block h-0.5 w-5 rounded-full bg-[#344054]';
const sidebarClass =
  'fixed left-0 top-0 z-11 flex h-[100svh] w-58 flex-col overflow-y-auto border-r border-[#e4e7ec] bg-white px-4 py-5 max-[980px]:z-15 max-[980px]:w-[min(320px,88vw)] max-[980px]:max-w-[88vw] max-[980px]:shadow-[20px_0_60px_rgba(16,24,40,0.16)] max-[980px]:transition-transform max-[980px]:duration-[180ms]';
const navClass = 'mt-8 grid gap-1.5';
const navItemClass =
  'flex min-h-11 items-center gap-3 rounded-lg border border-transparent px-3 text-sm font-bold text-[#475467] no-underline transition hover:border-[#e4e7ec] hover:bg-[#f9fafb] hover:text-[#1d2939]';
const mainContentClass =
  'relative z-1 min-w-0 px-4 pb-10 pt-24 sm:px-6 min-[981px]:ml-58 min-[981px]:px-8 min-[981px]:pt-28 min-[1440px]:px-10';
const authShellClass =
  'fitzone-ui relative grid min-h-screen place-items-center bg-[#f8f9fb] p-8 font-[Inter,Arial,sans-serif] text-[#1d2939] max-[680px]:p-4';
const authCardClass =
  'rounded-2xl border border-[#e4e7ec] bg-white p-8 text-center shadow-[0_16px_40px_rgba(16,24,40,0.08)]';
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
      <header className={mobileBarClass}>
        <a
          className='flex min-w-0 items-center gap-3 text-[#1d2939] no-underline'
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

      {isMobileMenuOpen && (
        <button
          aria-label='Close member navigation'
          className='mobile-navigation-backdrop fixed inset-0 z-14 hidden cursor-pointer border-0 p-0 max-[980px]:block'
          onClick={() => setIsMobileMenuOpen(false)}
          type='button'
        ></button>
      )}

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
          className='flex items-center gap-3 px-2 text-[#1d2939] no-underline max-[680px]:gap-2.5 max-[680px]:px-1'
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
                className={`${navItemClass} ${isActive ? 'border-[#fecdca] bg-[#fef3f2] text-[#b42318]' : ''}`}
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

      <header className='member-topbar'>
        <div>
          <p className='shell-topbar-title'>{activePage}</p>
          <span className='shell-topbar-context'>FitZone member portal</span>
        </div>
        <span className='shell-topbar-context'>{fullName}</span>
      </header>

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
