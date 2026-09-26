import { useEffect, useState } from 'react';
import {
  AuthenticateWithRedirectCallback,
  SignedIn,
  SignedOut,
  useSignIn,
  useUser
} from '@clerk/clerk-react';
import RedirectSignedInUser from '../../components/RedirectSignedInUser';
import {
  AUTH_REDIRECT_AFTER_LOGIN,
  getAuthErrorMessage
} from '../../authConfig';
import { getStripePaymentAccess } from '../../../../shared/api';
import {
  clearPaidMembershipAccess,
  getSavedPaidMembershipAccess,
  hasRecentPaymentConfirmation
} from '../../../membership-flow/shared/planSelection';
import FitZoneLogo from '../../../../shared/ui/FitZoneLogo';

const authCard =
  'rounded-[30px] border border-[#3a3a3a] bg-[#242424] shadow-[0_24px_70px_rgba(0,0,0,0.5)] max-[640px]:rounded-[22px]';
const headingClass =
  'mb-0 mt-0 text-2xl leading-[1.05] tracking-normal sm:text-[32px] lg:text-[clamp(32px,3.2vw,37px)]';
const headingText =
  'm-0 max-w-[420px] text-base leading-[1.45] text-[#475467] max-[640px]:hidden';
const fieldClass = 'grid gap-2.5 max-[640px]:gap-2';
const labelClass = 'text-[13px] font-black text-[#344054]';
const inputClass =
  'min-h-11 w-full rounded-xl border border-[#414141] bg-[#2d2d2d] px-3.5 font-[inherit] text-white placeholder:text-[#667085] focus:border-[#e6002e] focus:outline-none focus:shadow-[0_0_0_3px_rgba(230,0,46,0.12)] disabled:cursor-not-allowed disabled:opacity-65 sm:min-h-[57px] sm:rounded-2xl sm:px-[19px]';
const messageClass = 'fz-notice fz-notice-error mt-0';
const successMessageClass = 'fz-notice fz-notice-success mt-0';
const infoMessageClass = 'fz-notice fz-notice-info mt-0';
const primaryButton =
  'min-h-11 w-full cursor-pointer rounded-xl border-0 bg-[#e6002e] text-[15px] font-black text-white shadow-[0_18px_28px_rgba(230,0,46,0.2)] transition hover:-translate-y-px hover:bg-[#ff1744] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0 sm:min-h-14 sm:rounded-2xl';
const secondaryButton =
  'cursor-pointer rounded-[14px] border border-[#414141] bg-[#2d2d2d] text-sm font-black text-[#344054] transition hover:border-[#e6002e] hover:bg-[#fef3f2] disabled:cursor-not-allowed disabled:opacity-65 max-[640px]:rounded-xl max-[640px]:text-xs';
const newMemberPaymentMessage =
  'Complete your membership payment before logging in.';
const expiredMembershipMessage =
  'Your membership has expired. Please renew your plan to continue.';
const newMemberPaymentAction = 'Choose a plan and complete payment';
const expiredMembershipAction = 'Renew membership';

function hasPreviousPayment(paymentAccess) {
  return Boolean(
    paymentAccess?.hasPaymentHistory ||
    paymentAccess?.id ||
    paymentAccess?.created ||
    paymentAccess?.currentPeriodEnd ||
    paymentAccess?.planName ||
    paymentAccess?.planSlug
  );
}

function savePendingPaymentEmail(email) {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return;
  }

  window.sessionStorage.setItem('fitzonePendingMemberEmail', trimmedEmail);
}

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

function getSignInMemberName(resource) {
  return [resource?.userData?.firstName, resource?.userData?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
}

async function activateSessionAndOpenDashboard(setActive, sessionId) {
  if (!sessionId) {
    throw new Error('Clerk did not return a session after verification.');
  }

  await setActive({ session: sessionId });
  window.location.assign(AUTH_REDIRECT_AFTER_LOGIN);
}

function SignedInLoginRedirect() {
  const { isLoaded, user } = useUser();
  const [redirectTo, setRedirectTo] = useState('');
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
        setRedirectTo('/choose-plan');
        return;
      }

      const savedAccess = getSavedPaidMembershipAccess(email);
      const recentlyPaid = hasRecentPaymentConfirmation(savedAccess, email);

      try {
        const access = await getStripePaymentAccess(email, memberName);

        if (isCurrent) {
          if (!access.paid && !recentlyPaid) {
            clearPaidMembershipAccess(email);
          }
          setRedirectTo(
            access.paid || recentlyPaid
              ? AUTH_REDIRECT_AFTER_LOGIN
              : '/choose-plan'
          );
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setRedirectTo(
            savedAccess?.paid ? AUTH_REDIRECT_AFTER_LOGIN : '/choose-plan'
          );
        }
      }
    }

    verifyPaymentAccess();

    return () => {
      isCurrent = false;
    };
  }, [email, isLoaded, memberName]);

  return redirectTo ? <RedirectSignedInUser to={redirectTo} /> : null;
}

function LoginForm({ clerkEnabled }) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formStatus, setFormStatus] = useState('idle');
  const [formMessage, setFormMessage] = useState('');
  const [formMessageKind, setFormMessageKind] = useState('error');
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [secondFactor, setSecondFactor] = useState(null);
  const [secondFactorCode, setSecondFactorCode] = useState('');
  const [resetMode, setResetMode] = useState('idle');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetResource, setResetResource] = useState(null);
  const [paymentActionLabel, setPaymentActionLabel] = useState(
    newMemberPaymentAction
  );

  const isBusy = formStatus === 'submitting' || formStatus === 'redirecting';
  const isSecondFactorStep = Boolean(secondFactor);
  const isResetFlow = resetMode !== 'idle';

  const finishAuthenticatedSignIn = async (sessionId, resource) => {
    const memberName = getSignInMemberName(resource);
    const savedAccess = getSavedPaidMembershipAccess(email);
    const recentlyPaid = hasRecentPaymentConfirmation(savedAccess, email);
    const paymentAccess = await getStripePaymentAccess(email, memberName);

    if (!paymentAccess.paid && !recentlyPaid) {
      const isExpiredMembership = hasPreviousPayment(paymentAccess);

      clearPaidMembershipAccess(email);
      savePendingPaymentEmail(email);
      setPaymentRequired(true);
      setPaymentActionLabel(
        isExpiredMembership ? expiredMembershipAction : newMemberPaymentAction
      );
      setFormMessage(
        isExpiredMembership ? expiredMembershipMessage : newMemberPaymentMessage
      );
      return;
    }

    setFormStatus('redirecting');
    await activateSessionAndOpenDashboard(setActive, sessionId);
  };

  const handlePasswordSignIn = async (event) => {
    event.preventDefault();

    if (!clerkEnabled) {
      setFormMessage(
        'Add VITE_CLERK_PUBLISHABLE_KEY to .env and restart the dev server.'
      );
      return;
    }

    if (!isLoaded) {
      return;
    }

    try {
      setFormStatus('submitting');
      setFormMessage('');
      setFormMessageKind('error');
      setPaymentRequired(false);
      setSecondFactor(null);
      setSecondFactorCode('');
      setPaymentActionLabel(newMemberPaymentAction);

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
        await finishAuthenticatedSignIn(
          passwordAttempt.createdSessionId || signInAttempt.createdSessionId,
          passwordAttempt
        );
        return;
      }

      if (passwordAttempt.status === 'needs_second_factor') {
        const factor = getSecondFactor(passwordAttempt);

        if (!factor) {
          setFormMessage(
            'This account requires verification, but Clerk did not return a supported verification method.'
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
        `Sign in could not finish. Clerk returned status: ${passwordAttempt.status}.`
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

    if (!isLoaded || !secondFactor) {
      return;
    }

    try {
      setFormStatus('submitting');
      setFormMessage('');
      setFormMessageKind('error');

      const resource = secondFactor.resource || signIn;
      const secondFactorAttempt = await resource.attemptSecondFactor(
        getSecondFactorPayload(secondFactor, secondFactorCode)
      );

      if (secondFactorAttempt.status === 'complete') {
        await finishAuthenticatedSignIn(
          secondFactorAttempt.createdSessionId ||
            secondFactor.resource?.createdSessionId,
          secondFactorAttempt
        );
        return;
      }

      setFormMessage(
        `Sign in could not finish. Clerk returned status: ${secondFactorAttempt.status}.`
      );
    } catch (error) {
      console.error(error);
      setFormMessage(getAuthErrorMessage(error));
    } finally {
      setFormStatus('idle');
    }
  };

  const handleSocialSignIn = async (strategy) => {
    if (!clerkEnabled) {
      setFormMessage(
        'Add VITE_CLERK_PUBLISHABLE_KEY to .env and restart the dev server.'
      );
      return;
    }

    if (!isLoaded) {
      return;
    }

    try {
      setFormStatus('redirecting');
      setFormMessage('');
      setFormMessageKind('error');
      setPaymentRequired(false);
      setPaymentActionLabel(newMemberPaymentAction);
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: '/login/sso-callback',
        redirectUrlComplete: AUTH_REDIRECT_AFTER_LOGIN
      });
    } catch (error) {
      console.error(error);
      setFormStatus('idle');
      setFormMessage(
        getAuthErrorMessage(
          error,
          'Unable to sign in. Check your details and try again.'
        )
      );
    }
  };

  const openForgotPassword = () => {
    setResetMode('request');
    setResetCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setResetResource(null);
    setSecondFactor(null);
    setPaymentRequired(false);
    setFormMessage('');
    setFormMessageKind('error');
  };

  const closeForgotPassword = () => {
    if (isBusy) {
      return;
    }

    setResetMode('idle');
    setResetCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setResetResource(null);
    setFormMessage('');
    setFormMessageKind('error');
  };

  const handleResetRequest = async (event) => {
    event.preventDefault();

    if (!clerkEnabled) {
      setFormMessage(
        'Add VITE_CLERK_PUBLISHABLE_KEY to .env and restart the dev server.'
      );
      return;
    }

    if (!isLoaded) {
      return;
    }

    try {
      setFormStatus('submitting');
      setFormMessage('');
      setFormMessageKind('error');

      const attempt = await signIn.create({
        identifier: email,
        strategy: 'reset_password_email_code'
      });

      setResetResource(attempt);
      setResetMode('code');
      setFormMessage('Enter the password reset code sent to your email.');
      setFormMessageKind('info');
    } catch (error) {
      console.error(error);
      setFormMessage(getAuthErrorMessage(error));
      setFormMessageKind('error');
    } finally {
      setFormStatus('idle');
    }
  };

  const handleResetCode = async (event) => {
    event.preventDefault();

    if (!isLoaded || !resetResource) {
      return;
    }

    try {
      setFormStatus('submitting');
      setFormMessage('');
      setFormMessageKind('error');

      const attempt = await resetResource.attemptFirstFactor({
        code: resetCode,
        strategy: 'reset_password_email_code'
      });

      if (attempt.status !== 'needs_new_password') {
        setFormMessage(
          `Password reset could not continue. Clerk returned status: ${attempt.status}.`
        );
        return;
      }

      setResetResource(attempt);
      setResetMode('password');
      setFormMessage('Code verified. Create your new password.');
      setFormMessageKind('info');
    } catch (error) {
      console.error(error);
      setFormMessage(getAuthErrorMessage(error));
      setFormMessageKind('error');
    } finally {
      setFormStatus('idle');
    }
  };

  const handleNewPassword = async (event) => {
    event.preventDefault();

    if (!isLoaded || !resetResource) {
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setFormMessage('Passwords do not match.');
      setFormMessageKind('error');
      return;
    }

    try {
      setFormStatus('submitting');
      setFormMessage('');
      setFormMessageKind('error');

      const attempt = await resetResource.resetPassword({
        password: newPassword,
        signOutOfOtherSessions: true
      });

      if (attempt.status !== 'complete') {
        setFormMessage(
          `Password reset could not finish. Clerk returned status: ${attempt.status}.`
        );
        return;
      }

      setResetMode('idle');
      setResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setResetResource(null);
      setPassword('');
      setShowPassword(false);
      setFormMessage(
        'Password reset successfully. Sign in with your new password.'
      );
      setFormMessageKind('success');
    } catch (error) {
      console.error(error);
      setFormMessage(getAuthErrorMessage(error));
      setFormMessageKind('error');
    } finally {
      setFormStatus('idle');
    }
  };

  const handleSubmit = isResetFlow
    ? resetMode === 'request'
      ? handleResetRequest
      : resetMode === 'code'
        ? handleResetCode
        : handleNewPassword
    : isSecondFactorStep
      ? handleSecondFactorSubmit
      : handlePasswordSignIn;

  return (
    <form
      className={`${authCard} grid w-full max-w-[532px] gap-2.5 rounded-[18px] px-3.5 pb-3.5 pt-4 sm:gap-[18px] sm:rounded-[30px] sm:px-[35px] sm:pb-[18px] sm:pt-11`}
      onSubmit={handleSubmit}
    >
      <div>
        <h2 className={`${headingClass} mb-2 max-[640px]:mb-0`}>
          {resetMode === 'request'
            ? 'Reset your password'
            : resetMode === 'code'
              ? 'Check your email'
              : resetMode === 'password'
                ? 'Create a new password'
                : 'Login to your account'}
        </h2>
        <p className={headingText}>
          {resetMode === 'request'
            ? 'Enter your account email and we will send you a reset code.'
            : resetMode === 'code'
              ? `Enter the verification code sent to ${email}.`
              : resetMode === 'password'
                ? 'Choose a secure new password for your FitZone account.'
                : 'Enter your details below to access your FitZone dashboard.'}
        </p>
      </div>

      {resetMode === 'request' ? (
        <label className={fieldClass}>
          <span className={labelClass}>Email</span>
          <input
            className={inputClass}
            autoComplete='email'
            disabled={isBusy}
            onChange={(event) => setEmail(event.target.value)}
            placeholder='yourname@email.com'
            required
            type='email'
            value={email}
          />
        </label>
      ) : resetMode === 'code' ? (
        <label className={fieldClass}>
          <span className={labelClass}>Reset code</span>
          <input
            className={inputClass}
            autoComplete='one-time-code'
            disabled={isBusy}
            inputMode='numeric'
            onChange={(event) => setResetCode(event.target.value)}
            placeholder='Enter reset code'
            required
            value={resetCode}
          />
        </label>
      ) : resetMode === 'password' ? (
        <>
          <label className={fieldClass}>
            <span className={labelClass}>New password</span>
            <div className='grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center overflow-hidden rounded-xl border border-[#414141] bg-[#2d2d2d] focus-within:border-[#e6002e] focus-within:shadow-[0_0_0_3px_rgba(230,0,46,0.12)] sm:min-h-[57px] sm:rounded-2xl'>
              <input
                className='min-h-[42px] w-full border-0 bg-transparent px-3.5 font-[inherit] text-white placeholder:text-[#667085] focus:outline-none disabled:cursor-not-allowed disabled:opacity-65 sm:min-h-[55px] sm:px-[19px]'
                autoComplete='new-password'
                disabled={isBusy}
                minLength={8}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder='••••••••'
                required
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
              />
              <button
                className='cursor-pointer bg-transparent px-[18px] text-[13px] font-black text-[#e6002e] disabled:cursor-not-allowed disabled:opacity-65'
                disabled={isBusy}
                onClick={() => setShowPassword((currentValue) => !currentValue)}
                type='button'
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          <label className={fieldClass}>
            <span className={labelClass}>Confirm new password</span>
            <input
              className={inputClass}
              autoComplete='new-password'
              disabled={isBusy}
              minLength={8}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              placeholder='••••••••'
              required
              type={showPassword ? 'text' : 'password'}
              value={confirmNewPassword}
            />
          </label>
        </>
      ) : isSecondFactorStep ? (
        <label className={fieldClass}>
          <span className={labelClass}>
            {getSecondFactorLabel(secondFactor)}
          </span>
          <input
            className={inputClass}
            autoComplete='one-time-code'
            disabled={isBusy}
            onChange={(event) => setSecondFactorCode(event.target.value)}
            placeholder='Enter verification code'
            required
            value={secondFactorCode}
          />
        </label>
      ) : (
        <>
          <label className={fieldClass}>
            <span className={labelClass}>Email</span>
            <input
              className={inputClass}
              autoComplete='email'
              disabled={isBusy}
              onChange={(event) => setEmail(event.target.value)}
              placeholder='yourname@email.com'
              required
              type='email'
              value={email}
            />
          </label>

          <label className={fieldClass}>
            <span className={labelClass}>Password</span>
            <div className='grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center overflow-hidden rounded-xl border border-[#414141] bg-[#2d2d2d] focus-within:border-[#e6002e] focus-within:shadow-[0_0_0_3px_rgba(230,0,46,0.12)] sm:min-h-[57px] sm:rounded-2xl'>
              <input
                className='min-h-[42px] w-full border-0 bg-transparent px-3.5 font-[inherit] text-white placeholder:text-[#667085] focus:outline-none disabled:cursor-not-allowed disabled:opacity-65 sm:min-h-[55px] sm:px-[19px]'
                autoComplete='current-password'
                disabled={isBusy}
                onChange={(event) => setPassword(event.target.value)}
                placeholder='••••••••'
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
              <button
                className='cursor-pointer bg-transparent px-[18px] text-[13px] font-black text-[#e6002e] disabled:cursor-not-allowed disabled:opacity-65'
                disabled={isBusy}
                onClick={() => setShowPassword((currentValue) => !currentValue)}
                type='button'
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
        </>
      )}

      {!isResetFlow && !isSecondFactorStep && (
        <div className='my-1.5 mb-3 flex items-center justify-end max-[640px]:my-0 max-[640px]:mb-0'>
          <button
            className='cursor-pointer bg-transparent text-[13px] font-black text-[#e6002e] disabled:cursor-not-allowed disabled:opacity-65'
            disabled={isBusy}
            onClick={openForgotPassword}
            type='button'
          >
            Forgot password?
          </button>
        </div>
      )}

      {isResetFlow && (
        <button
          className='w-fit cursor-pointer bg-transparent text-[13px] font-black text-[#475467] disabled:cursor-not-allowed disabled:opacity-65'
          disabled={isBusy}
          onClick={closeForgotPassword}
          type='button'
        >
          ← Back to login
        </button>
      )}

      {formMessage && (
        <p
          role={
            formMessageKind === 'success' || formMessageKind === 'info'
              ? 'status'
              : 'alert'
          }
          className={
            formMessageKind === 'success'
              ? successMessageClass
              : formMessageKind === 'info'
                ? infoMessageClass
                : messageClass
          }
        >
          {formMessage}
        </p>
      )}

      {!isResetFlow && paymentRequired && (
        <a
          className='inline-flex min-h-11 items-center justify-center rounded-[13px] border border-[#414141] bg-[#2d2d2d] text-[13px] font-black text-white no-underline transition hover:border-[#e6002e]'
          href='/choose-plan'
        >
          {paymentActionLabel}
        </a>
      )}

      <button className={primaryButton} disabled={isBusy} type='submit'>
        {formStatus === 'submitting'
          ? resetMode === 'request'
            ? 'Sending code...'
            : resetMode === 'code'
              ? 'Verifying code...'
              : resetMode === 'password'
                ? 'Saving password...'
                : isSecondFactorStep
                  ? 'Verifying...'
                  : 'Signing in...'
          : resetMode === 'request'
            ? 'Send reset code'
            : resetMode === 'code'
              ? 'Verify code'
              : resetMode === 'password'
                ? 'Reset password'
                : isSecondFactorStep
                  ? 'Verify'
                  : 'Login'}
      </button>

      {!isResetFlow && (
        <>
          <div className='my-[13px] mb-1.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-[18px] text-[#667085] max-[640px]:my-0 max-[640px]:gap-3'>
            <span className='h-px bg-[#d0d5dd]'></span>
            <p className='m-0 text-sm max-[640px]:text-xs'>or continue with</p>
            <span className='h-px bg-[#d0d5dd]'></span>
          </div>

          <div className='grid grid-cols-2 gap-7 max-[640px]:gap-2.5'>
            <button
              className={`${secondaryButton} min-h-[49px] max-[640px]:min-h-10`}
              disabled={isBusy}
              onClick={() => handleSocialSignIn('oauth_google')}
              type='button'
            >
              Google
            </button>
            <button
              className={`${secondaryButton} min-h-[49px] max-[640px]:min-h-10`}
              disabled={isBusy}
              onClick={() => handleSocialSignIn('oauth_apple')}
              type='button'
            >
              Apple
            </button>
          </div>

          <p className='m-0 text-center text-[13px] text-[#667085] max-[640px]:text-xs'>
            Don't have an account?{' '}
            <a
              className='font-black text-[#e6002e] no-underline'
              href='/signup'
            >
              Join FitZone
            </a>
          </p>
        </>
      )}
    </form>
  );
}

function LoginPage({ clerkEnabled }) {
  if (window.location.pathname.includes('/sso-callback')) {
    return <AuthenticateWithRedirectCallback />;
  }

  return (
    <main className='fitzone-ui relative min-h-screen overflow-x-hidden overflow-y-auto bg-[#f8f9fb] font-[Inter,Arial,sans-serif] text-[#1d2939]'>
      <div className='pointer-events-none absolute left-[-210px] top-[70px] h-[480px] w-[560px] rounded-full bg-[rgba(230,0,46,0.15)]'></div>
      <div className='pointer-events-none absolute bottom-[-150px] right-[-110px] h-[430px] w-[430px] rounded-full bg-[rgba(230,0,46,0.15)]'></div>

      <section className='relative z-[1] grid min-h-screen grid-cols-1 items-center justify-center gap-2.5 p-2.5 sm:p-6 lg:grid-cols-[minmax(430px,520px)_minmax(430px,532px)] lg:gap-[clamp(46px,6vw,86px)] lg:p-[clamp(28px,5vw,70px)] max-[1060px]:grid-cols-[minmax(0,620px)]'>
        <aside
          className={`${authCard} relative flex min-h-[692px] flex-col overflow-hidden rounded-[30px] bg-[#181818] px-[42px] pb-14 pt-[46px] before:absolute before:left-0 before:right-0 before:top-0 before:h-[5px] before:bg-[#e6002e] max-[1060px]:min-h-[560px] max-[640px]:hidden`}
        >
          <a
            className='inline-flex w-fit items-center gap-4 text-white no-underline'
            href='/'
          >
            <FitZoneLogo className='h-[55px] w-[55px] max-[640px]:h-10 max-[640px]:w-10' />
            <div>
              <strong className='block text-[29px] leading-none max-[640px]:text-xl'>
                FITZONE
              </strong>
              <small className='mt-1.5 block text-[11px] font-black text-[#e6002e] max-[640px]:text-[8px]'>
                GYM & FITNESS
              </small>
            </div>
          </a>

          <div className='mt-[84px] max-[640px]:mt-4'>
            <h1 className='mb-5 mt-0 max-w-[410px] text-[clamp(44px,4vw,50px)] leading-[1.18] tracking-normal max-[640px]:mb-2 max-[640px]:text-2xl'>
              Welcome back, champion.
            </h1>
            <p className='m-0 max-w-[410px] text-lg leading-[1.5] text-[#475467] max-[640px]:text-xs max-[640px]:leading-[1.45]'>
              Sign in to manage your membership, book classes, track workouts,
              and continue your fitness journey with FitZone.
            </p>
          </div>

          <div className='mt-auto grid grid-cols-3 gap-[22px] max-[640px]:mt-4 max-[640px]:gap-2'>
            {[
              ['24/7', 'Member Access'],
              ['50+', 'Weekly Classes'],
              ['4', 'Expert Trainers']
            ].map(([value, label]) => (
              <div
                className='grid min-h-[93px] items-center justify-items-center rounded-[20px] border border-[#3a3a3a] bg-[#252525] px-2.5 py-[18px] max-[640px]:min-h-[64px] max-[640px]:rounded-xl max-[640px]:py-2'
                key={label}
              >
                <strong className='text-[27px] leading-none text-[#e6002e] max-[640px]:text-lg'>
                  {value}
                </strong>
                <span className='mt-2 text-center text-[11px] font-semibold text-[#667085] max-[640px]:mt-1 max-[640px]:text-[9px]'>
                  {label}
                </span>
              </div>
            ))}
          </div>

          <blockquote className='mb-0 mt-[52px] text-center text-[15px] font-black max-[640px]:mt-4 max-[640px]:text-xs'>
            “Small progress every day adds up to big results.”
          </blockquote>
        </aside>

        <section className='grid min-w-0 gap-3 max-[640px]:order-1'>
          <div className='hidden rounded-[18px] border border-[#303030] bg-[#181818] p-4 max-[640px]:block max-[640px]:rounded-[16px] max-[640px]:p-3'>
            <a
              className='mb-4 inline-flex items-center gap-3 text-white no-underline max-[640px]:mb-2'
              href='/'
            >
              <FitZoneLogo className='h-10 w-10 max-[640px]:h-9 max-[640px]:w-9' />
              <div>
                <strong className='block text-xl leading-none'>FITZONE</strong>
                <small className='mt-1 block text-[8px] font-black text-[#e6002e]'>
                  GYM & FITNESS
                </small>
              </div>
            </a>
            <h1 className='mb-1 mt-0 text-[30px] leading-none max-[640px]:text-2xl'>
              Welcome back
            </h1>
            <p className='m-0 text-[13px] leading-[1.45] text-[#475467] max-[640px]:text-xs'>
              Sign in to continue your fitness journey.
            </p>
          </div>

          {!clerkEnabled && (
            <div
              className={`${authCard} grid w-full max-w-[532px] gap-[18px] px-4 pb-[18px] pt-6 sm:px-[35px] sm:pt-11`}
            >
              <div>
                <h2 className={headingClass}>Connect Clerk</h2>
                <p className={headingText}>
                  Add your Clerk publishable key to enable login.
                </p>
              </div>
              <code className='block overflow-wrap-anywhere rounded-[14px] border border-[#414141] bg-[#171717] p-3.5 text-[13px] text-white'>
                VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
              </code>
            </div>
          )}

          {clerkEnabled && (
            <>
              <SignedOut>
                <>
                  <LoginForm clerkEnabled={clerkEnabled} />
                  <div className='hidden grid-cols-3 gap-2 max-[640px]:grid'>
                    {[
                      ['24/7', 'Access'],
                      ['50+', 'Classes'],
                      ['4', 'Trainers']
                    ].map(([value, label]) => (
                      <div
                        className='rounded-xl border border-[#303030] bg-[#181818] px-2 py-2.5 text-center'
                        key={label}
                      >
                        <strong className='block text-lg leading-none text-[#e6002e]'>
                          {value}
                        </strong>
                        <span className='mt-1 block text-[10px] font-bold text-[#667085]'>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              </SignedOut>

              <SignedIn>
                <SignedInLoginRedirect />
              </SignedIn>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

export default LoginPage;
