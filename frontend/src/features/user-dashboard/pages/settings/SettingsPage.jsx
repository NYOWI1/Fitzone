import { UserProfile } from '@clerk/clerk-react';
import './SettingsPage.css';

const clerkAppearance = {
  variables: {
    colorBackground: '#ffffff',
    colorInputBackground: '#ffffff',
    colorInputText: '#1d2939',
    colorPrimary: '#b42318',
    colorText: '#1d2939',
    colorTextSecondary: '#667085',
    colorNeutral: '#344054',
    borderRadius: '10px',
    fontFamily: 'Inter, Arial, sans-serif'
  },
  elements: {
    rootBox: 'settings-clerk-root w-full max-w-none',
    cardBox: 'settings-clerk-card-box w-full max-w-none shadow-none',
    card: 'settings-clerk-card w-full max-w-none border border-[#e4e7ec] bg-white shadow-none',
    navbar: 'settings-clerk-navbar border-r border-[#e4e7ec] bg-[#f9fafb]',
    navbarButton:
      'min-h-11 rounded-lg text-[#475467] hover:bg-[#fef3f2] hover:text-[#b42318]',
    navbarButtonActive: 'bg-[#fef3f2] text-[#b42318]',
    headerTitle: 'text-[#1d2939]',
    headerSubtitle: 'text-[#667085]',
    profileSectionTitleText: 'text-[#1d2939]',
    profileSectionPrimaryButton:
      'min-h-10 rounded-lg px-3 font-bold text-[#b42318] hover:bg-[#fef3f2]',
    profileSectionContent: 'text-[#344054]',
    formFieldLabel: 'font-bold text-[#344054]',
    formFieldInput:
      'min-h-11 border-[#d0d5dd] bg-white text-[#1d2939] focus:border-[#b42318]',
    formButtonPrimary: 'bg-[#b42318] text-white hover:bg-[#8f1d14]',
    badge: 'border border-[#fecdca] bg-[#fef3f2] text-[#b42318]',
    menuButton: 'text-[#475467] hover:bg-[#fef3f2] hover:text-[#b42318]',
    menuList: 'border border-[#e4e7ec] bg-white shadow-lg',
    menuItem: 'text-[#344054] hover:bg-[#f9fafb]',
    footer: 'hidden'
  }
};

export default function SettingsPage() {
  return (
    <section className='member-settings-page min-w-0 pb-6'>
      <header>
        <span className='member-settings-eyebrow'>ACCOUNT SETTINGS</span>
        <h1 className='m-0 mb-2 text-3xl font-black leading-none sm:text-[38px]'>
          Settings
        </h1>
        <p className='m-0 max-w-[720px] text-sm leading-relaxed text-[#667085] sm:text-base'>
          Manage your profile, email addresses, connected accounts, and
          security.
        </p>
      </header>

      <div className='member-settings-panel mt-7 min-w-0'>
        <UserProfile
          appearance={clerkAppearance}
          fallback={
            <p className='m-0 rounded-xl border border-[#e4e7ec] bg-white px-5 py-6 text-sm font-bold text-[#667085]'>
              Loading account settings...
            </p>
          }
          routing='virtual'
        />
      </div>
    </section>
  );
}
