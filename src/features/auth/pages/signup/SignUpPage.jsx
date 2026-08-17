import { useState } from 'react';
import { SignedIn, SignedOut, useSignUp } from '@clerk/clerk-react';
import RedirectSignedInUser from '../../components/RedirectSignedInUser';
import {
  AUTH_REDIRECT_AFTER_SIGNUP,
  getAuthErrorMessage
} from '../../authConfig';

const pageContent = 'relative z-[1] mx-auto max-w-[1140px]';
const authCard =
  'rounded-[30px] border border-[#3a3a3a] bg-[#242424] shadow-[0_24px_70px_rgba(0,0,0,0.48)] max-[640px]:rounded-[18px]';
const headingClass =
  'mb-1 mt-0 text-[23px] leading-[1.06] tracking-normal sm:mb-1.5 sm:text-[32px] lg:text-[clamp(32px,3.2vw,38px)]';
const headingText =
  'm-0 max-w-[480px] text-base leading-[1.18] text-[#bdbdbd] max-[640px]:text-[11px] max-[640px]:leading-[1.3]';
const fieldClass = 'grid gap-2.5 max-[640px]:gap-1';
const labelClass = 'text-xs font-black text-[#dedede] max-[640px]:text-[11px]';
const inputClass =
  'min-h-10 w-full rounded-xl border border-[#414141] bg-[#2d2d2d] px-3 font-[inherit] text-sm text-white placeholder:text-[#a8a8a8] focus:border-[#e6002e] focus:outline-none focus:shadow-[0_0_0_3px_rgba(230,0,46,0.12)] disabled:cursor-not-allowed disabled:opacity-65 sm:min-h-[52px] sm:rounded-2xl sm:px-[18px] sm:text-base';
const messageClass =
  'm-0 rounded-[14px] border border-[rgba(230,0,46,0.35)] bg-[rgba(230,0,46,0.12)] px-3.5 py-3 text-[13px] leading-[1.4] text-[#ff8ea2] max-[640px]:px-3 max-[640px]:py-2 max-[640px]:text-xs';
const primaryButton =
  'min-h-[54px] w-full cursor-pointer rounded-2xl border-0 bg-[#e6002e] text-[15px] font-black text-white shadow-[0_18px_28px_rgba(230,0,46,0.2)] transition hover:-translate-y-px hover:bg-[#ff1744] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0 max-[640px]:min-h-10 max-[640px]:rounded-xl max-[640px]:text-sm';
const secondaryButton =
  'min-h-[54px] w-full cursor-pointer rounded-2xl border border-[#414141] bg-[#2d2d2d] text-[15px] font-black text-white transition hover:border-[#e6002e] hover:bg-[#32151b] disabled:cursor-not-allowed disabled:opacity-65 max-[640px]:min-h-10 max-[640px]:rounded-xl max-[640px]:text-sm';

function SignUpForm({ clerkEnabled }) {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [formValues, setFormValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [formMode, setFormMode] = useState('details');
  const [formStatus, setFormStatus] = useState('idle');
  const [formMessage, setFormMessage] = useState('');

  const isBusy = formStatus === 'submitting';

  const updateFormValue = (field, value) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value
    }));
  };

  const createAccount = async (event) => {
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

    if (formValues.password !== formValues.confirmPassword) {
      setFormMessage('Passwords do not match.');
      return;
    }

    if (!acceptedTerms) {
      setFormMessage('Please agree to the FitZone terms and privacy policy.');
      return;
    }

    try {
      setFormStatus('submitting');
      setFormMessage('');

      const signUpAttempt = await signUp.create({
        emailAddress: formValues.email,
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        password: formValues.password,
        unsafeMetadata: {
          phoneNumber: formValues.phoneNumber
        }
      });

      if (signUpAttempt.status === 'complete') {
        await setActive({ session: signUpAttempt.createdSessionId });
        window.location.href = AUTH_REDIRECT_AFTER_SIGNUP;
        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setFormMode('verify');
      setFormMessage('Enter the verification code Clerk sent to your email.');
    } catch (error) {
      console.error(error);
      setFormMessage(getAuthErrorMessage(error));
    } finally {
      setFormStatus('idle');
    }
  };

  const verifyEmail = async (event) => {
    event.preventDefault();

    if (!isLoaded) {
      return;
    }

    try {
      setFormStatus('submitting');
      setFormMessage('');

      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode
      });

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        window.location.href = AUTH_REDIRECT_AFTER_SIGNUP;
        return;
      }

      setFormMessage(
        'Verification is not complete yet. Check the code and try again.'
      );
    } catch (error) {
      console.error(error);
      setFormMessage(getAuthErrorMessage(error));
    } finally {
      setFormStatus('idle');
    }
  };

  if (formMode === 'verify') {
    return (
      <form
        className={`${authCard} grid w-full gap-2.5 px-3 pb-3 pt-4 sm:gap-[18px] sm:px-10 sm:pb-[22px] sm:pt-[38px]`}
        onSubmit={verifyEmail}
      >
        <div>
          <h2 className={headingClass}>Verify your email</h2>
          <p className={headingText}>
            Enter the code sent to {formValues.email} to finish creating your
            account.
          </p>
        </div>

        <label className={fieldClass}>
          <span className={labelClass}>Verification Code</span>
          <input
            className={inputClass}
            autoComplete='one-time-code'
            disabled={isBusy}
            onChange={(event) => setVerificationCode(event.target.value)}
            placeholder='Enter code'
            required
            value={verificationCode}
          />
        </label>

        {formMessage && <p className={messageClass}>{formMessage}</p>}

        <button className={primaryButton} disabled={isBusy} type='submit'>
          {isBusy ? 'Verifying...' : 'Verify Account'}
        </button>

        <button
          className={secondaryButton}
          disabled={isBusy}
          onClick={() => setFormMode('details')}
          type='button'
        >
          Back to details
        </button>
      </form>
    );
  }

  return (
    <form
      className={`${authCard} grid w-full gap-2 px-3 pb-3 pt-3.5 sm:gap-[18px] sm:px-10 sm:pb-[22px] sm:pt-[38px]`}
      onSubmit={createAccount}
    >
      <div>
        <h2 className={headingClass}>Create your account</h2>
        <p className={headingText}>
          First create your account. Then choose the membership plan that fits
          you best.
        </p>
      </div>

      <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-[30px]'>
        <label className={fieldClass}>
          <span className={labelClass}>First Name</span>
          <input
            className={inputClass}
            autoComplete='given-name'
            disabled={isBusy}
            onChange={(event) =>
              updateFormValue('firstName', event.target.value)
            }
            required
            value={formValues.firstName}
          />
        </label>

        <label className={fieldClass}>
          <span className={labelClass}>Last Name</span>
          <input
            className={inputClass}
            autoComplete='family-name'
            disabled={isBusy}
            onChange={(event) =>
              updateFormValue('lastName', event.target.value)
            }
            required
            value={formValues.lastName}
          />
        </label>
      </div>

      <label className={fieldClass}>
        <span className={labelClass}>Email</span>
        <input
          className={inputClass}
          autoComplete='email'
          disabled={isBusy}
          onChange={(event) => updateFormValue('email', event.target.value)}
          placeholder='yourname@email.com'
          required
          type='email'
          value={formValues.email}
        />
      </label>

      <label className={fieldClass}>
        <span className={labelClass}>Phone Number</span>
        <input
          className={inputClass}
          autoComplete='tel'
          disabled={isBusy}
          onChange={(event) =>
            updateFormValue('phoneNumber', event.target.value)
          }
          placeholder='+66 00 000 0000'
          required
          type='tel'
          value={formValues.phoneNumber}
        />
      </label>

      <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-[30px]'>
        <label className={fieldClass}>
          <span className={labelClass}>Password</span>
          <input
            className={inputClass}
            autoComplete='new-password'
            disabled={isBusy}
            onChange={(event) =>
              updateFormValue('password', event.target.value)
            }
            placeholder='••••••••'
            required
            type='password'
            value={formValues.password}
          />
        </label>

        <label className={fieldClass}>
          <span className={labelClass}>Confirm Password</span>
          <input
            className={inputClass}
            autoComplete='new-password'
            disabled={isBusy}
            onChange={(event) =>
              updateFormValue('confirmPassword', event.target.value)
            }
            placeholder='••••••••'
            required
            type='password'
            value={formValues.confirmPassword}
          />
        </label>
      </div>

      <label className='flex items-center gap-3 text-[13px] text-[#bdbdbd] max-[640px]:items-start max-[640px]:gap-2 max-[640px]:text-[11px]'>
        <input
          className='h-[18px] w-[18px] accent-[#e6002e] disabled:cursor-not-allowed disabled:opacity-65 max-[640px]:h-4 max-[640px]:w-4'
          checked={acceptedTerms}
          disabled={isBusy}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
          type='checkbox'
        />
        <span>I agree to FitZone terms and privacy policy</span>
      </label>

      {formMessage && <p className={messageClass}>{formMessage}</p>}

      <button className={primaryButton} disabled={isBusy} type='submit'>
        {isBusy ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );
}

function SignUpPage({ clerkEnabled }) {
  return (
    <main className='relative min-h-screen overflow-x-hidden overflow-y-auto bg-[#0d0d0d] p-2 font-[Inter,Arial,sans-serif] text-white sm:px-6 sm:py-6 lg:px-[clamp(28px,5vw,70px)] lg:py-[38px]'>
      <div className='pointer-events-none absolute -left-[130px] -top-[94px] h-[470px] w-[470px] rounded-full bg-[rgba(230,0,46,0.16)]'></div>
      <div className='pointer-events-none absolute -right-[90px] -top-[126px] h-[340px] w-[340px] rounded-full bg-[rgba(230,0,46,0.15)]'></div>
      <div className='pointer-events-none absolute -bottom-[145px] -right-[22px] h-[430px] w-[430px] rounded-full bg-[rgba(255,213,79,0.09)]'></div>

      <header
        className={`${pageContent} flex min-h-[66px] items-center justify-between rounded-[22px] border border-[#3a3a3a] bg-[#181818] py-3 pl-6 pr-7 max-[640px]:min-h-12 max-[640px]:rounded-[16px] max-[640px]:px-3 max-[640px]:py-1.5`}
      >
        <a
          className='inline-flex items-center gap-3.5 text-white no-underline'
          href='/'
        >
          <span className='grid h-10 w-10 place-items-center rounded-[14px] bg-[#e6002e] text-[21px] font-black max-[640px]:h-8 max-[640px]:w-8 max-[640px]:rounded-[10px] max-[640px]:text-base'>
            F
          </span>
          <strong className='text-[23px] tracking-normal max-[640px]:text-base'>
            FITZONE
          </strong>
        </a>
        <div className='flex items-center gap-[30px] max-[640px]:gap-2'>
          <span className='text-[13px] text-[#bdbdbd] max-[640px]:hidden'>
            Already a member?
          </span>
          <a
            className='inline-flex min-h-[43px] min-w-[170px] items-center justify-center rounded-[15px] border border-[#3a3a3a] bg-[#252525] text-[13px] font-black text-white no-underline max-[640px]:min-h-9 max-[640px]:min-w-0 max-[640px]:px-4 max-[640px]:text-xs'
            href='/login'
          >
            Login
          </a>
        </div>
      </header>

      <section
        className={`${pageContent} grid grid-cols-1 items-center justify-center gap-0 pt-2 sm:pt-6 lg:grid-cols-[minmax(390px,470px)_minmax(520px,600px)] lg:justify-between lg:gap-[clamp(48px,6vw,70px)] lg:pt-[30px] max-[1080px]:grid-cols-[minmax(0,680px)] max-[1080px]:justify-center`}
      >
        <aside
          className={`${authCard} relative min-h-[626px] overflow-hidden rounded-[30px] bg-[#181818] px-9 pb-7 pt-[46px] before:absolute before:left-0 before:right-0 before:top-0 before:h-[5px] before:bg-[#e6002e] max-[640px]:hidden`}
        >
          <span className='mb-[22px] block text-[13px] font-black uppercase text-[#e6002e] max-[640px]:mb-2 max-[640px]:text-[10px]'>
            Start your fitness journey
          </span>
          <h1 className='mb-3.5 mt-0 text-[clamp(40px,4.2vw,44px)] leading-[1.16] tracking-normal max-[640px]:mb-2 max-[640px]:text-2xl'>
            Join FitZone and train smarter.
          </h1>
          <p className='m-0 max-w-[390px] text-[17px] leading-[1.18] text-[#bdbdbd] max-[640px]:text-xs max-[640px]:leading-[1.45]'>
            Create your account to book classes, choose membership plans, and
            track your progress from one place.
          </p>

          <div className='mt-16 grid gap-[42px] max-[640px]:mt-4 max-[640px]:gap-3'>
            <div className='flex items-center gap-4'>
              <span className='grid h-[45px] flex-[0_0_45px] place-items-center rounded-2xl bg-[#e6002e] text-xl font-black max-[640px]:h-8 max-[640px]:flex-[0_0_32px] max-[640px]:rounded-xl max-[640px]:text-sm'>
                ✓
              </span>
              <div>
                <strong className='mb-[7px] block text-base'>
                  Choose your plan
                </strong>
                <p className='m-0 text-[13px] leading-[1.25] text-[#bdbdbd]'>
                  Basic, Standard, or Premium membership options.
                </p>
              </div>
            </div>
            <div className='flex items-center gap-4'>
              <span className='grid h-[45px] flex-[0_0_45px] place-items-center rounded-2xl bg-[#e6002e] text-xl font-black max-[640px]:h-8 max-[640px]:flex-[0_0_32px] max-[640px]:rounded-xl max-[640px]:text-sm'>
                ✓
              </span>
              <div>
                <strong className='mb-[7px] block text-base'>
                  Book classes faster
                </strong>
                <p className='m-0 text-[13px] leading-[1.25] text-[#bdbdbd]'>
                  Reserve HIIT, yoga, strength, and cycling classes.
                </p>
              </div>
            </div>
            <div className='flex items-center gap-4'>
              <span className='grid h-[45px] flex-[0_0_45px] place-items-center rounded-2xl bg-[#e6002e] text-xl font-black max-[640px]:h-8 max-[640px]:flex-[0_0_32px] max-[640px]:rounded-xl max-[640px]:text-sm'>
                ✓
              </span>
              <div>
                <strong className='mb-[7px] block text-base'>
                  Track progress
                </strong>
                <p className='m-0 text-[13px] leading-[1.25] text-[#bdbdbd]'>
                  Follow your workout journey and goals.
                </p>
              </div>
            </div>
          </div>

          <blockquote className='mb-0 mt-[38px] text-center text-sm font-black max-[640px]:mt-4 max-[640px]:text-xs'>
            No pressure. Start simple, improve every week.
          </blockquote>
        </aside>

        <section className='min-w-0 max-[640px]:order-1'>
          {!clerkEnabled && (
            <div
              className={`${authCard} grid w-full gap-[18px] px-3 pb-3 pt-4 sm:px-10 sm:pb-[22px] sm:pt-[38px]`}
            >
              <div>
                <h2 className={headingClass}>Connect Clerk</h2>
                <p className={headingText}>
                  Add your Clerk publishable key to enable sign up.
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
                <SignUpForm clerkEnabled={clerkEnabled} />
              </SignedOut>

              <SignedIn>
                <RedirectSignedInUser to={AUTH_REDIRECT_AFTER_SIGNUP} />
              </SignedIn>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

export default SignUpPage;
