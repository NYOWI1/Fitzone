import { UserProfile } from '@clerk/clerk-react';

const clerkAppearance = {
  variables: {
    colorBackground: '#252525',
    colorInputBackground: '#2c2c2c',
    colorInputText: '#ffffff',
    colorPrimary: '#e6002e',
    colorText: '#ffffff',
    colorTextSecondary: '#bdbdbd',
    colorNeutral: '#ffffff',
    borderRadius: '14px',
    fontFamily: 'Inter, Arial, sans-serif'
  },
  elements: {
    rootBox: 'w-full max-w-full',
    cardBox: 'w-full max-w-full shadow-none',
    card: 'w-full max-w-full border border-[#414141] shadow-[0_24px_65px_rgba(0,0,0,0.32)]',
    navbar: 'border-r border-[#414141] bg-[#202020]',
    navbarButton: 'text-[#bdbdbd] hover:text-white',
    navbarButtonActive: 'bg-[rgba(230,0,46,0.12)] text-white',
    headerTitle: 'text-white',
    headerSubtitle: 'text-[#bdbdbd]',
    profileSectionTitleText: 'text-white',
    profileSectionPrimaryButton: 'text-[#e6002e]',
    profileSectionContent: 'text-white',
    formFieldLabel: 'text-white',
    formFieldInput: 'border-[#414141] bg-[#2c2c2c] text-white',
    footer: 'hidden'
  }
};

export default function SettingsPage() {
  return (
    <section className='min-w-0 pb-6'>
      <header>
        <h1 className='m-0 mb-2 text-3xl font-black leading-none sm:text-[38px]'>
          Settings
        </h1>
        <p className='m-0 text-sm text-[#bdbdbd] sm:text-base'>
          Manage your profile, email addresses, connected accounts, and security.
        </p>
      </header>

      <div className='mt-7 min-w-0 overflow-hidden rounded-[28px]'>
        <UserProfile
          appearance={clerkAppearance}
          fallback={
            <p className='m-0 rounded-[24px] border border-[#414141] bg-[#252525] px-5 py-6 text-sm font-bold text-[#bdbdbd]'>
              Loading account settings...
            </p>
          }
          routing='virtual'
        />
      </div>
    </section>
  );
}
