import { useEffect, useState } from 'react';
import {
  AuthenticateWithRedirectCallback,
  useClerk,
  useSignIn,
  useUser
} from '@clerk/clerk-react';
import { getAuthErrorMessage } from '../../../auth/authConfig';
import { hasAdminAccess } from '../../adminAuth';
import FitZoneLogo from '../../../../shared/ui/FitZoneLogo';

const adminThemeStyle = {
  '--admin-red': '#d90429',
  '--admin-red-dark': '#b00020',
  '--admin-panel': '#242424',
  '--admin-border': '#393939',
  '--admin-muted': '#b8b8b8'
};

const brandClass = 'flex items-center gap-3.5';
const logoClass = 'h-[46px] w-[46px]';
const brandTitleClass = 'm-0 mb-[5px] text-[23px] leading-none text-white';
const brandLabelClass = 'block text-[10px] font-extrabold text-[#d90429]';
const inputClass =
  'min-h-12 rounded-[14px] border border-[#393939] bg-[#2b2b2b] px-4 text-base font-medium text-white outline-none placeholder:text-[#868686] focus:border-[#d90429] focus:shadow-[0_0_0_3px_rgba(217,4,41,0.14)] disabled:cursor-not-allowed disabled:opacity-65';
const primaryButtonClass =
  'min-h-12 cursor-pointer rounded-[14px] border border-[#b00020] bg-[#d90429] text-sm font-black text-white shadow-[0_18px_28px_rgba(217,4,41,0.18)] transition hover:-translate-y-px hover:bg-[#f20b34] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0';
const secondaryButtonClass =
  'min-h-12 cursor-pointer rounded-[14px] border border-[#393939] bg-[#2b2b2b] text-sm font-black text-white transition hover:border-[#d90429] hover:bg-[#241216] disabled:cursor-not-allowed disabled:opacity-65';

function getSecondFactor(resource) {
  const factors = resource?.supportedSecondFactors || [];
  const priority = ['totp', 'phone_code', 'email_code', 'backup_code'];

  return (
    priority
      .map((strategy) => factors.find((factor) => factor.strategy === strategy))
      .find(Boolean) ||
    factors[0] ||
    null
  );
}

function getSecondFactorLabel(factor) {
  if (factor?.strategy === 'backup_code') {
    return 'Backup code';
  }

  if (factor?.strategy === 'phone_code') {
    return 'Phone verification code';
  }

  if (factor?.strategy === 'email_code') {
    return 'Email verification code';
  }

  return 'Authenticator code';
}

function getSecondFactorPayload(factor, code) {
  return {
    code,
    strategy: factor?.strategy || 'totp'
  };
}

function getSecondFactorPreparePayload(factor) {
  return {
    strategy: factor?.strategy || 'totp',
    ...(factor?.phoneNumberId ? { phoneNumberId: factor.phoneNumberId } : {}),
    ...(factor?.emailAddressId ? { emailAddressId: factor.emailAddressId } : {})
  };
}

function AdminLoginShell({ children }) {
  return (
    <main
      className='fitzone-ui relative grid min-h-screen place-items-center overflow-hidden bg-[#f8f9fb] p-5 font-sans text-[#1d2939]'
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
    <section className='relative z-[1] grid w-[min(100%,430px)] gap-5 rounded-2xl border border-[#e4e7ec] bg-white p-7 shadow-[0_24px_70px_rgba(16,24,40,0.12)] max-[520px]:p-5'>
      <div className={brandClass}>
        <FitZoneLogo className={logoClass} />
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
  const [secondFactorCode, setSecondFactorCode] = useState('');
  const [secondFactor, setSecondFactor] = useState(null);
  const [formStatus, setFormStatus] = useState('idle');
  const [formMessage, setFormMessage] = useState('');
  const isBusy = formStatus === 'submitting' || formStatus === 'redirecting';
  const isSignedInAdmin = isSignedIn && hasAdminAccess(user);
  const isSecondFactorStep = Boolean(secondFactor);

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
        identifier: email
      });
      const passwordAttempt =
        signInAttempt.status === 'needs_first_factor'
          ? await signInAttempt.attemptFirstFactor({
              strategy: 'password',
              password
            })
          : signInAttempt;

      if (passwordAttempt.status === 'complete') {
        await setActive({ session: passwordAttempt.createdSessionId });
        window.location.href = '/admin';
        return;
      }

      if (passwordAttempt.status === 'needs_second_factor') {
        const factor = getSecondFactor(passwordAttempt);

        if (!factor) {
          setFormMessage(
            'This admin account requires two-step verification, but Clerk did not return a supported second factor.'
          );
          return;
        }

        if (['phone_code', 'email_code'].includes(factor.strategy)) {
          await passwordAttempt.prepareSecondFactor(
            getSecondFactorPreparePayload(factor)
          );
        }

        setSecondFactor({
          ...factor,
          resource: passwordAttempt
        });
        setSecondFactorCode('');
        setFormMessage('');
        return;
      }

      setFormMessage(
        `Admin sign in could not finish. Clerk returned status: ${passwordAttempt.status}.`
      );
    } catch (error) {
      console.error(error);
      setFormMessage(getAuthErrorMessage(error));
    } finally {
      setFormStatus('idle');
    }
  };

  const handleSecondFactorSubmit = async (event) => {
    event.preventDefault();

    if (!isSignInLoaded || !secondFactor) {
      return;
    }

    try {
      setFormStatus('submitting');
      setFormMessage('');

      const resource = secondFactor.resource || signIn;
      const secondFactorAttempt = await resource.attemptSecondFactor(
        getSecondFactorPayload(secondFactor, secondFactorCode)
      );

      if (secondFactorAttempt.status === 'complete') {
        await setActive({ session: secondFactorAttempt.createdSessionId });
        window.location.href = '/admin';
        return;
      }

      setFormMessage(
        `Admin sign in could not finish. Clerk returned status: ${secondFactorAttempt.status}.`
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
      onSubmit={
        isSecondFactorStep ? handleSecondFactorSubmit : handlePasswordSignIn
      }
    >
      <div className={brandClass}>
        <FitZoneLogo className={logoClass} />
        <div>
          <h1 className={brandTitleClass}>FitZone</h1>
          <span className={brandLabelClass}>ADMIN LOGIN</span>
        </div>
      </div>

      <div>
        <h2 className='mb-2 mt-2 text-[30px] leading-none max-[520px]:text-[24px]'>
          {isSecondFactorStep ? 'Verify admin login' : 'Admin login'}
        </h2>
      </div>

      {isSecondFactorStep ? (
        <>
          <p className='m-0 text-sm leading-[1.45] text-[#b8b8b8]'>
            Enter the {getSecondFactorLabel(secondFactor).toLowerCase()} for{' '}
            {email}.
          </p>
          <label className='grid gap-2 text-[13px] font-extrabold text-[#dedede]'>
            {getSecondFactorLabel(secondFactor)}
            <input
              autoComplete='one-time-code'
              className={inputClass}
              disabled={isBusy}
              inputMode='numeric'
              onChange={(event) => setSecondFactorCode(event.target.value)}
              placeholder='Enter code'
              required
              value={secondFactorCode}
            />
          </label>
        </>
      ) : (
        <>
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
        </>
      )}

      {formMessage && (
        <p className='fz-notice fz-notice-error m-0' role='alert'>
          {formMessage}
        </p>
      )}

      <button className={primaryButtonClass} disabled={isBusy} type='submit'>
        {formStatus === 'submitting'
          ? isSecondFactorStep
            ? 'Verifying...'
            : 'Signing in...'
          : isSecondFactorStep
            ? 'Verify'
            : 'Login'}
      </button>

      {isSecondFactorStep && (
        <button
          className={secondaryButtonClass}
          disabled={isBusy}
          onClick={() => {
            setSecondFactor(null);
            setSecondFactorCode('');
            setPassword('');
            setFormMessage('');
          }}
          type='button'
        >
          Back to login
        </button>
      )}
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
