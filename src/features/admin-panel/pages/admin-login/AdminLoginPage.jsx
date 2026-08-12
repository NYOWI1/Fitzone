import { useEffect, useState } from 'react';
import {
  AuthenticateWithRedirectCallback,
  useClerk,
  useSignIn,
  useUser
} from '@clerk/clerk-react';
import { getAuthErrorMessage } from '../../../auth/authConfig';
import { hasAdminAccess } from '../../adminAuth';

const adminThemeStyle = {
  '--admin-red': '#d90429',
  '--admin-red-dark': '#b00020',
  '--admin-panel': '#242424',
  '--admin-border': '#393939',
  '--admin-muted': '#b8b8b8'
};

const brandClass = 'flex items-center gap-3.5';
const logoClass =
  'flex h-[46px] w-[46px] items-center justify-center rounded-2xl bg-[#d90429] text-[23px] font-extrabold text-white';
const brandTitleClass = 'm-0 mb-[5px] text-[23px] leading-none text-white';
const brandLabelClass = 'block text-[10px] font-extrabold text-[#d90429]';
const inputClass =
  'min-h-12 rounded-[14px] border border-[#393939] bg-[#2b2b2b] px-4 text-base font-medium text-white outline-none placeholder:text-[#868686] focus:border-[#d90429] focus:shadow-[0_0_0_3px_rgba(217,4,41,0.14)] disabled:cursor-not-allowed disabled:opacity-65';
const primaryButtonClass =
  'min-h-12 cursor-pointer rounded-[14px] border border-[#b00020] bg-[#d90429] text-sm font-black text-white shadow-[0_18px_28px_rgba(217,4,41,0.18)] transition hover:-translate-y-px hover:bg-[#f20b34] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0';
const secondaryButtonClass =
  'min-h-12 cursor-pointer rounded-[14px] border border-[#393939] bg-[#2b2b2b] text-sm font-black text-white transition hover:border-[#d90429] hover:bg-[#241216] disabled:cursor-not-allowed disabled:opacity-65';

function AdminLoginShell({ children }) {
  return (
    <main
      className='relative grid min-h-screen place-items-center overflow-hidden bg-[#0f0f0f] p-5 font-sans text-white'
      style={adminThemeStyle}
    >
      <div className='pointer-events-none absolute left-[-120px] top-20 h-100 w-100 rounded-full bg-[rgba(217,4,41,0.12)]'></div>
      <div className='pointer-events-none absolute bottom-[-140px] right-[-110px] h-95 w-95 rounded-full bg-[rgba(77,163,255,0.06)]'></div>
      {children}
    </main>
  );
}

function AdminLoginCard({ children, label = 'ADMIN LOGIN', title }) {
  return (
    <section className='relative z-[1] grid w-[min(100%,430px)] gap-5 rounded-[28px] border border-[#393939] bg-[#242424] p-7 shadow-[0_24px_70px_rgba(0,0,0,0.45)] max-[520px]:rounded-[22px] max-[520px]:p-5'>
      <div className={brandClass}>
        <div className={logoClass}>F</div>
        <div>
          <h1 className={brandTitleClass}>FitZone</h1>
          <span className={brandLabelClass}>{label}</span>
        </div>
      </div>

      <div>
        <h2 className='mb-2 mt-2 text-[30px] leading-none max-[520px]:text-[24px]'>
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

function AdminLoginForm() {
  const { signOut } = useClerk();
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();
  const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formStatus, setFormStatus] = useState('idle');
  const [formMessage, setFormMessage] = useState('');
  const isBusy = formStatus === 'submitting' || formStatus === 'redirecting';
  const isSignedInAdmin = isSignedIn && hasAdminAccess(user);

  useEffect(() => {
    if (isUserLoaded && isSignedInAdmin) {
      window.location.replace('/admin');
    }
  }, [isSignedInAdmin, isUserLoaded]);

  if (!isUserLoaded) {
    return (
      <AdminLoginCard label='ADMIN ACCESS' title='Checking access'>
        <p className='m-0 text-sm leading-[1.45] text-[#b8b8b8]'>
          Checking your Clerk session.
        </p>
      </AdminLoginCard>
    );
  }

  if (isSignedInAdmin) {
    return null;
  }

  if (isSignedIn) {
    return (
      <AdminLoginCard label='ADMIN ACCESS' title='Access denied'>
        <p className='m-0 text-sm leading-[1.45] text-[#b8b8b8]'>
          Your Clerk account is signed in, but it does not have admin access.
        </p>
        <button
          className={`${secondaryButtonClass} mt-5 w-full`}
          onClick={() => signOut({ redirectUrl: '/admin/login' })}
          type='button'
        >
          Sign out
        </button>
      </AdminLoginCard>
    );
  }

  const handlePasswordSignIn = async (event) => {
    event.preventDefault();

    if (!isSignInLoaded) {
      return;
    }

    try {
      setFormStatus('submitting');
      setFormMessage('');

      const signInAttempt = await signIn.create({
        identifier: email,
        password,
        strategy: 'password'
      });

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        window.location.href = '/admin';
        return;
      }

      setFormMessage(
        'This admin account needs another verification step before it can sign in.'
      );
    } catch (error) {
      console.error(error);
      setFormMessage(getAuthErrorMessage(error));
    } finally {
      setFormStatus('idle');
    }
  };

  return (
    <form
      className='relative z-[1] grid w-[min(100%,430px)] gap-5 rounded-[28px] border border-[#393939] bg-[#242424] p-7 shadow-[0_24px_70px_rgba(0,0,0,0.45)] max-[520px]:rounded-[22px] max-[520px]:p-5'
      onSubmit={handlePasswordSignIn}
    >
      <div className={brandClass}>
        <div className={logoClass}>F</div>
        <div>
          <h1 className={brandTitleClass}>FitZone</h1>
          <span className={brandLabelClass}>ADMIN LOGIN</span>
        </div>
      </div>

      <div>
        <h2 className='mb-2 mt-2 text-[30px] leading-none max-[520px]:text-[24px]'>
          Admin login
        </h2>
      </div>

      <label className='grid gap-2 text-[13px] font-extrabold text-[#dedede]'>
        Email
        <input
          autoComplete='email'
          className={inputClass}
          disabled={isBusy}
          onChange={(event) => setEmail(event.target.value)}
          placeholder='admin@email.com'
          required
          type='email'
          value={email}
        />
      </label>

      <label className='grid gap-2 text-[13px] font-extrabold text-[#dedede]'>
        Password
        <input
          autoComplete='current-password'
          className={inputClass}
          disabled={isBusy}
          onChange={(event) => setPassword(event.target.value)}
          placeholder='Password'
          required
          type='password'
          value={password}
        />
      </label>

      {formMessage && (
        <p className='m-0 rounded-[14px] border border-[rgba(217,4,41,0.35)] bg-[rgba(217,4,41,0.12)] px-4 py-3 text-sm font-bold text-[#ff8ea2]'>
          {formMessage}
        </p>
      )}

      <button className={primaryButtonClass} disabled={isBusy} type='submit'>
        {formStatus === 'submitting' ? 'Signing in...' : 'Login'}
      </button>
    </form>
  );
}

function AdminLoginPage({ clerkEnabled }) {
  if (window.location.pathname.includes('/sso-callback')) {
    return <AuthenticateWithRedirectCallback />;
  }

  if (!clerkEnabled) {
    return (
      <AdminLoginShell>
        <AdminLoginCard label='ADMIN ACCESS' title='Connect Clerk'>
          <p className='m-0 text-sm leading-[1.45] text-[#b8b8b8]'>
            Add your Clerk publishable key to .env and restart the dev server to
            enable admin authentication.
          </p>
          <code className='mt-5 block overflow-wrap-anywhere rounded-[14px] border border-[#393939] bg-[#171717] p-3.5 text-[13px] text-white'>
            VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
          </code>
        </AdminLoginCard>
      </AdminLoginShell>
    );
  }

  return (
    <AdminLoginShell>
      <AdminLoginForm />
    </AdminLoginShell>
  );
}

export default AdminLoginPage;
