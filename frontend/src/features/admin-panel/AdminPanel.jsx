import { useEffect, useState } from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';
import ClassesPage from './pages/classes/ClassesPage';
import CrowdDetectionPage from './pages/crowd-detection/CrowdDetectionPage';
import MembersPage from './pages/members/MembersPage';
import OverviewPage from './pages/overview/OverviewPage';
import PaymentsPage from './pages/payments/PaymentsPage';
import PlansPage from './pages/plans/PlansPage';
import PTBookingsPage from './pages/pt-bookings/PTBookingsPage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';
import TrainersPage from './pages/trainers/TrainersPage';
import {
  getActiveAdminPage,
  getAdminPageFromMenuSlug,
  getAdminPageUrl,
  getMenuSlug,
  menuItems
} from './adminPanelUtils';
import { hasAdminAccess } from './adminAuth';
import { getSiteSettings } from '../../shared/api';
import FitZoneLogo from '../../shared/ui/FitZoneLogo';

const adminThemeStyle = {
  '--admin-red': '#b42318',
  '--admin-red-dark': '#8f1d14',
  '--admin-green': '#16803c',
  '--admin-yellow': '#ffd54f',
  '--admin-blue': '#4da3ff',
  '--admin-bg': '#f8f9fb',
  '--admin-panel': '#ffffff',
  '--admin-panel-soft': '#f9fafb',
  '--admin-border': '#e4e7ec',
  '--admin-muted': '#667085'
};
const brandClass = 'flex items-center gap-3.5';
const logoClass = 'h-11.5 w-11.5';
const brandTitleClass = 'm-0 mb-1.25 text-[20px] leading-none text-[#1d2939]';
const brandLabelClass = 'block text-[10px] font-extrabold text-[#b42318]';
const mobileBarClass =
  'fixed inset-x-0 top-0 z-12 hidden h-18 items-center justify-between gap-4 border-b border-[#e4e7ec] bg-[rgba(255,255,255,0.96)] px-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)] backdrop-blur max-[980px]:flex';
const mobileMenuButtonClass =
  'hidden h-11.5 w-11.5 flex-[0_0_46px] flex-col items-center justify-center gap-1.25 rounded-lg border border-[#d0d5dd] bg-white p-0 max-[980px]:flex';
const mobileMenuLineClass = 'block h-0.5 w-5 rounded-full bg-[#344054]';
const sidebarBaseClass =
  'fixed left-0 top-0 z-11 flex h-[100svh] w-58 flex-col gap-7 overflow-y-auto border-r border-[#e4e7ec] bg-white px-4 py-5 max-[980px]:z-15 max-[980px]:w-[min(320px,88vw)] max-[980px]:max-w-[88vw] max-[980px]:shadow-[20px_0_60px_rgba(16,24,40,0.16)] max-[980px]:transition-transform max-[980px]:duration-[180ms]';
const menuClass = 'grid gap-1.5';
const menuItemBaseClass =
  'flex min-h-11 items-center gap-3 rounded-lg border px-3 text-sm font-bold no-underline transition';
const menuItemActiveClass = 'border-[#fecdca] bg-[#fef3f2] text-[#b42318]';
const menuItemInactiveClass =
  'border-transparent text-[#475467] hover:border-[#e4e7ec] hover:bg-[#f9fafb] hover:text-[#1d2939]';

function getAdminProfile(user) {
  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    'Admin account';
  const name =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.username ||
    email;
  const initial = (name || email || 'A').trim().charAt(0).toUpperCase() || 'A';

  return {
    email,
    initial,
    name
  };
}

function AdminAccessMessage({ action, brandName, message, title }) {
  return (
    <main
      className='fitzone-ui relative grid min-h-screen place-items-center overflow-hidden bg-[#f8f9fb] p-5 font-sans text-[#1d2939]'
      style={adminThemeStyle}
    >
      <div className='pointer-events-none absolute -left-30 top-20 h-100 w-100 rounded-full bg-[rgba(217,4,41,0.12)]'></div>
      <div className='pointer-events-none absolute -bottom-35 -right-27.5 h-95 w-95 rounded-full bg-[rgba(77,163,255,0.06)]'></div>

      <section className='relative z-1 grid w-[min(100%,430px)] gap-5 rounded-2xl border border-[#e4e7ec] bg-white p-7 shadow-[0_24px_70px_rgba(16,24,40,0.12)] max-[520px]:p-5'>
        <div className={brandClass}>
          <FitZoneLogo className={logoClass} />
          <div>
            <h1 className={brandTitleClass}>{brandName}</h1>
            <span className={brandLabelClass}>ADMIN ACCESS</span>
          </div>
        </div>

        <div>
          <h2 className='mb-2 mt-2 text-[30px] leading-none max-[520px]:text-[24px]'>
            {title}
          </h2>
          <p className='m-0 text-sm leading-[1.45] text-[#b8b8b8]'>{message}</p>
        </div>

        {action}
      </section>
    </main>
  );
}

function RedirectToAdminLogin() {
  useEffect(() => {
    window.location.replace('/admin/login');
  }, []);

  return null;
}

function ClerkAdminGate({ brandName, children }) {
  const { signOut } = useClerk();
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return (
      <AdminAccessMessage
        brandName={brandName}
        message='Checking your Clerk session before loading the admin panel.'
        title='Checking access'
      />
    );
  }

  if (!isSignedIn) {
    return <RedirectToAdminLogin />;
  }

  if (!hasAdminAccess(user)) {
    return (
      <AdminAccessMessage
        action={
          <button
            className='min-h-12 cursor-pointer rounded-[14px] border border-[#393939] bg-[#2b2b2b] px-5 text-sm font-black text-white transition hover:border-[#d90429] hover:bg-[#241216]'
            onClick={() => signOut({ redirectUrl: '/' })}
            type='button'
          >
            Sign out
          </button>
        }
        brandName={brandName}
        message='Your Clerk account is signed in, but it does not have admin access.'
        title='Access denied'
      />
    );
  }

  return children({ onAdminSignOut: () => signOut({ redirectUrl: '/' }) });
}

function AdminPanelShell({ onAdminSignOut }) {
  const { user } = useUser();
  const [activePage, setActivePage] = useState(() => getActiveAdminPage());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [siteSettings, setSiteSettings] = useState({});
  const brandName = siteSettings.brand?.name || 'Gym';
  const adminProfile = getAdminProfile(user);

  useEffect(() => {
    const updateActivePage = () => {
      setActivePage(getActiveAdminPage());
      setIsMobileMenuOpen(false);
    };

    window.addEventListener('hashchange', updateActivePage);
    window.addEventListener('popstate', updateActivePage);

    return () => {
      window.removeEventListener('hashchange', updateActivePage);
      window.removeEventListener('popstate', updateActivePage);
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadAdminShellSettings() {
      try {
        const settings = await getSiteSettings();

        if (isCurrent) {
          setSiteSettings(settings || {});
        }
      } catch (error) {
        console.error('Unable to load admin shell settings', error);
      }
    }

    loadAdminShellSettings();

    return () => {
      isCurrent = false;
    };
  }, []);

  const navigateToAdminPage = (event, nextPage) => {
    event.preventDefault();
    window.history.pushState(null, '', getAdminPageUrl(nextPage));
    setActivePage(nextPage);
    setIsMobileMenuOpen(false);
  };

  return (
    <main
      className='fitzone-ui relative min-h-screen overflow-x-hidden bg-[#f8f9fb] font-sans text-[#1d2939]'
      style={adminThemeStyle}
    >
      <header className={mobileBarClass}>
        <div className={brandClass}>
          <FitZoneLogo className={logoClass} />
          <div>
            <h1 className={brandTitleClass}>{brandName}</h1>
            <span className={brandLabelClass}>ADMIN PANEL</span>
          </div>
        </div>
        <button
          aria-controls='admin-sidebar'
          aria-expanded={isMobileMenuOpen}
          aria-label='Toggle admin navigation'
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
          aria-label='Close admin navigation'
          className='mobile-navigation-backdrop fixed inset-0 z-14 hidden border-0 p-0 max-[980px]:block'
          onClick={() => setIsMobileMenuOpen(false)}
          type='button'
        ></button>
      )}

      <aside
        className={
          isMobileMenuOpen
            ? `${sidebarBaseClass} max-[980px]:translate-x-0 max-[980px]:pointer-events-auto`
            : `${sidebarBaseClass} max-[980px]:translate-x-[-106%] max-[980px]:pointer-events-none`
        }
        id='admin-sidebar'
        aria-label='Admin navigation'
      >
        <div className={brandClass}>
          <FitZoneLogo className={logoClass} />
          <div>
            <h1 className={brandTitleClass}>{brandName}</h1>
            <span className={brandLabelClass}>ADMIN PANEL</span>
          </div>
        </div>

        <nav className={menuClass}>
          {menuItems.map((item) => {
            const slug = getMenuSlug(item);
            const isActive =
              slug === activePage ||
              (slug !== 'members' &&
                activePage === 'overview' &&
                slug === 'overview');
            const nextPage = getAdminPageFromMenuSlug(slug);

            return (
              <a
                className={
                  isActive
                    ? `${menuItemBaseClass} ${menuItemActiveClass}`
                    : `${menuItemBaseClass} ${menuItemInactiveClass}`
                }
                href={getAdminPageUrl(nextPage)}
                key={item}
                onClick={(event) => navigateToAdminPage(event, nextPage)}
              >
                <span
                  className={
                    isActive
                      ? 'h-2 w-2 rounded-full bg-[#d90429]'
                      : 'h-2 w-2 rounded-full bg-[#484848]'
                  }
                ></span>
                {item}
              </a>
            );
          })}
        </nav>

        <div className='mt-auto flex min-h-20.5 items-center gap-3 rounded-[20px] border border-[#393939] bg-[#242424] p-3.75'>
          <div className='flex h-11 w-11 flex-[0_0_44px] items-center justify-center rounded-full bg-[#d90429] text-xl font-extrabold text-white'>
            {adminProfile.initial}
          </div>
          <div className='min-w-0'>
            <strong className='mb-1.75 block truncate text-sm text-white'>
              {adminProfile.name}
            </strong>
            <span className='block truncate text-xs text-[#b8b8b8]'>
              {adminProfile.email}
            </span>
          </div>
        </div>

        <button
          className='min-h-11 cursor-pointer rounded-[14px] border border-[#393939] bg-[#2b2b2b] text-sm font-black text-white transition hover:border-[#d90429] hover:bg-[#241216]'
          onClick={onAdminSignOut}
          type='button'
        >
          Logout
        </button>
      </aside>

      <header className='admin-topbar'>
        <div>
          <p className='shell-topbar-title'>
            {activePage === 'pt-bookings'
              ? 'PT Bookings'
              : activePage.charAt(0).toUpperCase() + activePage.slice(1)}
          </p>
          <span className='shell-topbar-context'>FitZone administration</span>
        </div>
        <span className='shell-topbar-context'>{adminProfile.email}</span>
      </header>

      {activePage === 'classes' && <ClassesPage />}
      {activePage === 'trainers' && <TrainersPage />}
      {activePage === 'pt-bookings' && <PTBookingsPage />}
      {activePage === 'plans' && <PlansPage />}
      {activePage === 'payments' && <PaymentsPage />}
      {activePage === 'members' && <MembersPage />}
      {activePage === 'reports' && <ReportsPage />}
      <CrowdDetectionPage isVisible={activePage === 'crowd-detection'} />
      {activePage === 'settings' && <SettingsPage />}
      {activePage === 'overview' && <OverviewPage />}
    </main>
  );
}

function AdminPanel({ clerkEnabled }) {
  const [siteSettings, setSiteSettings] = useState({});
  const brandName = siteSettings.brand?.name || 'Gym';

  useEffect(() => {
    let isCurrent = true;

    async function loadAdminBrandSettings() {
      try {
        const settings = await getSiteSettings();

        if (isCurrent) {
          setSiteSettings(settings || {});
        }
      } catch (error) {
        console.error('Unable to load admin brand settings', error);
      }
    }

    loadAdminBrandSettings();

    return () => {
      isCurrent = false;
    };
  }, []);

  if (!clerkEnabled) {
    return (
      <AdminAccessMessage
        action={
          <code className='block overflow-wrap-anywhere rounded-[14px] border border-[#393939] bg-[#171717] p-3.5 text-[13px] text-white'>
            VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
          </code>
        }
        brandName={brandName}
        message='Add your Clerk publishable key to .env and restart the dev server to enable admin authentication.'
        title='Connect Clerk'
      />
    );
  }

  return (
    <ClerkAdminGate brandName={brandName}>
      {({ onAdminSignOut }) => (
        <AdminPanelShell onAdminSignOut={onAdminSignOut} />
      )}
    </ClerkAdminGate>
  );
}

export default AdminPanel;
