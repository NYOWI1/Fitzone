import { useEffect, useState } from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';
import './AdminPanel.css';
import ClassesPage from './pages/classes/ClassesPage';
import CrowdDetectionPage from './pages/crowd-detection/CrowdDetectionPage';
import MembersPage from './pages/members/MembersPage';
import OverviewPage from './pages/overview/OverviewPage';
import PaymentsPage from './pages/payments/PaymentsPage';
import PlansPage from './pages/plans/PlansPage';
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

const adminThemeStyle = {
  '--admin-red': '#d90429',
  '--admin-red-dark': '#b00020',
  '--admin-green': '#39e600',
  '--admin-yellow': '#ffd54f',
  '--admin-blue': '#4da3ff',
  '--admin-bg': '#0f0f0f',
  '--admin-panel': '#242424',
  '--admin-panel-soft': '#2b2b2b',
  '--admin-border': '#393939',
  '--admin-muted': '#b8b8b8'
};
const brandClass = 'flex items-center gap-3.5';
const logoClass =
  'flex h-[46px] w-[46px] items-center justify-center rounded-2xl bg-[#d90429] text-[23px] font-extrabold text-white';
const brandTitleClass = 'm-0 mb-[5px] text-[23px] leading-none text-white';
const brandLabelClass = 'block text-[10px] font-extrabold text-[#d90429]';
const mobileBarClass =
  'sticky top-3 z-[12] mb-6 hidden items-center justify-between gap-4 rounded-[22px] border border-[#393939] bg-[rgba(15,15,15,0.92)] p-3 max-[980px]:flex';
const mobileMenuButtonClass =
  'hidden h-[46px] w-[46px] flex-[0_0_46px] flex-col items-center justify-center gap-[5px] rounded-[14px] border border-[#393939] bg-[#242424] p-0 max-[980px]:flex';
const mobileMenuLineClass = 'block h-0.5 w-5 rounded-full bg-white';
const sidebarBaseClass =
  'fixed left-8 top-8 z-[2] flex h-[calc(100vh_-_64px)] w-[250px] flex-col gap-[34px] rounded-[28px] border border-[#393939] bg-[rgba(24,24,24,0.98)] px-[19px] py-[27px] max-[1360px]:static max-[1360px]:h-auto max-[1360px]:w-full max-[980px]:fixed max-[980px]:left-0 max-[980px]:top-0 max-[980px]:z-[15] max-[980px]:h-[100svh] max-[980px]:w-[min(330px,88vw)] max-[980px]:max-w-[88vw] max-[980px]:overflow-y-auto max-[980px]:rounded-r-3xl max-[980px]:rounded-l-none max-[980px]:px-[18px] max-[980px]:py-[22px] max-[980px]:transition-transform max-[980px]:duration-[180ms]';
const menuClass = 'grid gap-3 max-[1360px]:grid-cols-3 max-[980px]:grid-cols-1';
const menuItemBaseClass =
  'flex min-h-10 items-center gap-3.5 rounded-[14px] border px-3.5 text-sm font-bold no-underline transition';
const menuItemActiveClass = 'border-[#d90429] bg-[#241216] text-white';
const menuItemInactiveClass =
  'border-transparent text-[#b8b8b8] hover:border-[#d90429] hover:bg-[#241216] hover:text-white';

function AdminAccessMessage({ action, brandInitial, brandName, message, title }) {
  return (
    <main
      className='relative grid min-h-screen place-items-center overflow-hidden bg-[#0f0f0f] p-5 font-sans text-white'
      style={adminThemeStyle}
    >
      <div className='pointer-events-none absolute left-[-120px] top-20 h-100 w-100 rounded-full bg-[rgba(217,4,41,0.12)]'></div>
      <div className='pointer-events-none absolute bottom-[-140px] right-[-110px] h-95 w-95 rounded-full bg-[rgba(77,163,255,0.06)]'></div>

      <section
        className='relative z-[1] grid w-[min(100%,430px)] gap-5 rounded-[28px] border border-[#393939] bg-[#242424] p-7 shadow-[0_24px_70px_rgba(0,0,0,0.45)] max-[520px]:rounded-[22px] max-[520px]:p-5'
      >
        <div className={brandClass}>
          <div className={logoClass}>{brandInitial}</div>
          <div>
            <h1 className={brandTitleClass}>{brandName}</h1>
            <span className={brandLabelClass}>ADMIN ACCESS</span>
          </div>
        </div>

        <div>
          <h2 className='mb-2 mt-2 text-[30px] leading-none max-[520px]:text-[24px]'>
            {title}
          </h2>
          <p className='m-0 text-sm leading-[1.45] text-[#b8b8b8]'>
            {message}
          </p>
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

function ClerkAdminGate({ brandInitial, brandName, children }) {
  const { signOut } = useClerk();
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return (
      <AdminAccessMessage
        brandInitial={brandInitial}
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
        brandInitial={brandInitial}
        brandName={brandName}
        message='Your Clerk account is signed in, but it does not have admin access.'
        title='Access denied'
      />
    );
  }

  return children({ onAdminSignOut: () => signOut({ redirectUrl: '/' }) });
}

function AdminPanelShell({ onAdminSignOut }) {
  const [activePage, setActivePage] = useState(() => getActiveAdminPage());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [siteSettings, setSiteSettings] = useState({});
  const brandName = siteSettings.brand?.name || 'Gym';
  const brandInitial = brandName.trim().charAt(0).toUpperCase() || 'G';
  const adminContact = siteSettings.contact?.email || 'Admin account';

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
      className='relative min-h-screen overflow-x-hidden bg-[#0f0f0f] p-8 font-sans text-white max-[980px]:p-5 max-[560px]:p-3.5 max-[400px]:p-2.5'
      style={adminThemeStyle}
    >
      <div className='pointer-events-none absolute left-42.5 top-32.5 h-130 w-130 rounded-full bg-[rgba(217,4,41,0.08)]'></div>
      <div className='pointer-events-none absolute -right-30 top-140 h-95 w-95 rounded-full bg-[rgba(77,163,255,0.04)]'></div>

      <header className={mobileBarClass}>
        <div className={brandClass}>
          <div className={logoClass}>{brandInitial}</div>
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

      <button
        aria-label='Close admin navigation'
        className={
          isMobileMenuOpen
            ? 'fixed inset-0 z-14 hidden border-0 bg-[rgba(0,0,0,0.58)] p-0 max-[980px]:block'
            : 'hidden'
        }
        onClick={() => setIsMobileMenuOpen(false)}
        type='button'
      ></button>

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
          <div className={logoClass}>{brandInitial}</div>
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
            {adminContact.charAt(0).toUpperCase()}
          </div>
          <div>
            <strong className='mb-1.75 block text-sm text-white'>
              {adminContact}
            </strong>
            <span className='block text-xs text-[#b8b8b8]'>Site contact</span>
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

      {activePage === 'classes' && <ClassesPage />}
      {activePage === 'trainers' && <TrainersPage />}
      {activePage === 'plans' && <PlansPage />}
      {activePage === 'payments' && <PaymentsPage />}
      {activePage === 'members' && <MembersPage />}
      {activePage === 'reports' && <ReportsPage />}
      <CrowdDetectionPage isActive={activePage === 'crowd-detection'} />
      {activePage === 'settings' && <SettingsPage />}
      {activePage === 'overview' && <OverviewPage />}
    </main>
  );
}

function AdminPanel({ clerkEnabled }) {
  const [siteSettings, setSiteSettings] = useState({});
  const brandName = siteSettings.brand?.name || 'Gym';
  const brandInitial = brandName.trim().charAt(0).toUpperCase() || 'G';

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
        brandInitial={brandInitial}
        brandName={brandName}
        message='Add your Clerk publishable key to .env and restart the dev server to enable admin authentication.'
        title='Connect Clerk'
      />
    );
  }

  return (
    <ClerkAdminGate brandInitial={brandInitial} brandName={brandName}>
      {({ onAdminSignOut }) => (
        <AdminPanelShell onAdminSignOut={onAdminSignOut} />
      )}
    </ClerkAdminGate>
  );
}

export default AdminPanel;
