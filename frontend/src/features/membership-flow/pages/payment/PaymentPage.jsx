import { useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  createStripeCardSubscription,
  createStripePaymentIntent,
  getMembershipPlans
} from '../../../../shared/api';
import {
  isStripeEnabled,
  stripePublishableKey
} from '../../../../app/config/stripe';
import {
  getPlanFromSelection,
  getPlanMonthlyLabel,
  getPlanPriceValue,
  savePaidMembershipAccess,
  saveSelectedPlan
} from '../../shared/planSelection';
import FitZoneLogo from '../../../../shared/ui/FitZoneLogo';

const stripeScriptUrl = 'https://js.stripe.com/v3/';
const pageClass =
  'relative min-h-screen overflow-x-hidden bg-[#0d0d0d] p-4 font-[Inter,Arial,sans-serif] text-white sm:px-6 sm:py-7 lg:px-[clamp(28px,5vw,70px)] lg:py-9';
const containerClass = 'relative z-1 mx-auto w-full max-w-6xl';
const cardClass =
  'rounded-3xl border border-[#3a3a3a] bg-[#252525] shadow-[0_24px_70px_rgba(0,0,0,0.48)]';
const inputClass =
  'min-h-12 w-full rounded-2xl border border-[#414141] bg-[#2d2d2d] px-4 text-white outline-none placeholder:text-[#a8a8a8] focus:border-[#e6002e] disabled:cursor-not-allowed disabled:opacity-65';
const labelClass = 'grid gap-2.5';
const labelTextClass = 'text-xs font-black text-[#dedede]';
const messageClass =
  'mb-3.5 mt-0 rounded-2xl border border-[rgba(230,0,46,0.35)] bg-[rgba(230,0,46,0.12)] px-3.5 py-3 text-[13px] leading-[1.4] text-[#ff8ea2]';
const successMessageClass =
  'mb-3.5 mt-0 rounded-2xl border border-[rgba(57,230,0,0.28)] bg-[rgba(57,230,0,0.1)] px-3.5 py-3 text-[13px] leading-[1.4] text-[#a6ff8f]';

function loadStripeScript() {
  return new Promise((resolve, reject) => {
    if (window.Stripe) {
      resolve(window.Stripe);
      return;
    }

    const existingScript = document.querySelector(
      `script[src="${stripeScriptUrl}"]`
    );

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.Stripe));
      existingScript.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = stripeScriptUrl;
    script.onload = () => resolve(window.Stripe);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function getUserEmail(user) {
  return (
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    ''
  );
}

function getPendingMemberEmail() {
  return window.sessionStorage.getItem('fitzonePendingMemberEmail') || '';
}

function clearPendingMemberEmail() {
  window.sessionStorage.removeItem('fitzonePendingMemberEmail');
}

function isPaymentSuccessful(paymentIntent) {
  return String(paymentIntent?.status || '').toLowerCase() === 'succeeded';
}

function getPromptPayQrCode(paymentIntent) {
  return paymentIntent?.next_action?.promptpay_display_qr_code || null;
}

function PaymentPageContent({ clerkEmail = '' }) {
  const initialEmail = clerkEmail || getPendingMemberEmail();
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState('loading');
  const [stripeStatus, setStripeStatus] = useState('idle');
  const [stripeClient, setStripeClient] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [promptPayQrCode, setPromptPayQrCode] = useState(null);
  const [promptPayClientSecret, setPromptPayClientSecret] = useState('');
  const [formValues, setFormValues] = useState({
    cardholderName: '',
    email: initialEmail
  });
  const cardMountRef = useRef(null);
  const cardElementRef = useRef(null);

  const selectedSlug = new URLSearchParams(window.location.search).get('plan');
  const selectedPlan = useMemo(
    () => getPlanFromSelection(plans, selectedSlug),
    [plans, selectedSlug]
  );
  const monthlyAmount = getPlanPriceValue(selectedPlan);
  const isPromptPay = paymentMethod === 'promptpay';
  const isBusy = paymentStatus === 'saving';
  const isPromptPayPending =
    paymentStatus === 'pending' && Boolean(promptPayClientSecret);

  useEffect(() => {
    let isCurrent = true;

    async function loadPlans() {
      try {
        const nextPlans = await getMembershipPlans();

        if (isCurrent) {
          setPlans(nextPlans.filter((plan) => plan.active !== false));
          setStatus('ready');
        }
      } catch (error) {
        console.error(error);
        if (isCurrent) {
          setStatus('error');
        }
      }
    }

    loadPlans();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (selectedPlan) {
      saveSelectedPlan(selectedPlan);
    }
  }, [selectedPlan]);

  useEffect(() => {
    const nextEmail = clerkEmail || getPendingMemberEmail();

    if (nextEmail) {
      setFormValues((current) => ({ ...current, email: nextEmail }));
    }
  }, [clerkEmail]);

  useEffect(() => {
    if (!isStripeEnabled || status !== 'ready' || !selectedPlan) {
      return undefined;
    }

    let isCurrent = true;
    let nextCardElement = null;

    async function prepareStripe() {
      try {
        setStripeStatus('loading');
        const Stripe = await loadStripeScript();
        const nextStripeClient = Stripe(stripePublishableKey);
        const elements = nextStripeClient.elements();

        nextCardElement = elements.create('card', {
          hidePostalCode: true,
          style: {
            base: {
              color: '#ffffff',
              fontFamily: 'Inter, Arial, sans-serif',
              fontSize: '16px',
              '::placeholder': { color: '#a8a8a8' }
            },
            invalid: { color: '#ff8ea2' }
          }
        });

        nextCardElement.on('change', (event) => {
          if (!isCurrent) {
            return;
          }
          setCardComplete(event.complete);
          setCardError(event.error?.message || '');
        });

        if (cardMountRef.current) {
          nextCardElement.mount(cardMountRef.current);
          cardElementRef.current = nextCardElement;
        }

        if (isCurrent) {
          setStripeClient(nextStripeClient);
          setStripeStatus('ready');
        }
      } catch (error) {
        console.error(error);
        if (isCurrent) {
          setStripeStatus('error');
        }
      }
    }

    prepareStripe();

    return () => {
      isCurrent = false;
      nextCardElement?.destroy();
      if (cardElementRef.current === nextCardElement) {
        cardElementRef.current = null;
      }
    };
  }, [selectedPlan, status]);

  const updateFormValue = (field, value) => {
    setFormValues((current) => ({ ...current, [field]: value }));
  };

  const completePayment = (message, paymentIntent = null) => {
    savePaidMembershipAccess({
      email: formValues.email,
      memberName: formValues.cardholderName,
      paymentIntentId: paymentIntent?.id || '',
      plan: selectedPlan
    });
    setPaymentStatus('success');
    setPaymentMessage(message);
    clearPendingMemberEmail();
    window.setTimeout(() => {
      window.location.href = '/login';
    }, 900);
  };

  const checkPromptPayStatus = async ({ showPendingMessage = false } = {}) => {
    if (!stripeClient || !promptPayClientSecret) {
      return false;
    }

    const result = await stripeClient.retrievePaymentIntent(
      promptPayClientSecret
    );

    if (result.error) {
      if (showPendingMessage) {
        setPaymentMessage(
          result.error.message || 'Unable to check PromptPay status.'
        );
      }
      return false;
    }

    if (isPaymentSuccessful(result.paymentIntent)) {
      completePayment(
        'PromptPay payment succeeded. Redirecting to login...',
        result.paymentIntent
      );
      return true;
    }

    if (showPendingMessage) {
      setPaymentMessage(
        `PromptPay payment status: ${result.paymentIntent?.status || 'pending'}. Waiting for confirmation.`
      );
    }

    return false;
  };

  useEffect(() => {
    if (!isPromptPayPending || !stripeClient) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      checkPromptPayStatus().catch((error) => console.error(error));
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [isPromptPayPending, promptPayClientSecret, stripeClient]);

  const submitPayment = async (event) => {
    event.preventDefault();

    if (!selectedPlan) {
      setPaymentMessage('Choose a membership plan before paying.');
      return;
    }

    if (!isStripeEnabled) {
      setPaymentMessage(
        'Add VITE_STRIPE_PUBLISHABLE_KEY to .env and restart Vite.'
      );
      return;
    }

    if (stripeStatus !== 'ready' || !stripeClient) {
      setPaymentMessage('Stripe is still loading. Try again in a moment.');
      return;
    }

    if (!formValues.email.trim()) {
      setPaymentMessage('A Clerk account email is required before payment.');
      return;
    }

    if (!isPromptPay && (!cardComplete || !cardElementRef.current)) {
      setPaymentMessage(
        cardError || 'Enter a complete card number before paying.'
      );
      return;
    }

    if (isPromptPay && isPromptPayPending) {
      await checkPromptPayStatus({ showPendingMessage: true });
      return;
    }

    try {
      setPaymentStatus('saving');
      setPaymentMessage('');
      setPromptPayQrCode(null);
      setPromptPayClientSecret('');

      const paymentPayload = {
        amount: monthlyAmount * 100,
        currency: 'thb',
        description: `FitZone ${selectedPlan.name} Membership - ${formValues.cardholderName || 'FitZone Member'}`,
        plan: selectedPlan.name,
        planSlug: selectedPlan.slug,
        member: formValues.cardholderName || 'FitZone Member',
        memberEmail: formValues.email
      };

      if (isPromptPay) {
        const paymentIntent = await createStripePaymentIntent({
          ...paymentPayload,
          paymentMethodType: 'promptpay'
        });
        const confirmation = await stripeClient.confirmPromptPayPayment(
          paymentIntent.clientSecret,
          {
            payment_method: {
              billing_details: {
                email: formValues.email,
                name: formValues.cardholderName || 'FitZone Member'
              }
            }
          }
        );

        if (confirmation.error) {
          throw new Error(
            confirmation.error.message ||
              'Stripe could not create a PromptPay QR code.'
          );
        }

        if (isPaymentSuccessful(confirmation.paymentIntent)) {
          completePayment(
            'PromptPay payment succeeded. Redirecting to login...',
            confirmation.paymentIntent
          );
          return;
        }

        const qrCode = getPromptPayQrCode(confirmation.paymentIntent);

        if (!qrCode) {
          throw new Error('Stripe did not return a PromptPay QR code.');
        }

        setPromptPayQrCode(qrCode);
        setPromptPayClientSecret(paymentIntent.clientSecret);
        setPaymentStatus('pending');
        setPaymentMessage(
          'Scan the PromptPay QR code in your banking app. PromptPay renewals are manual.'
        );
        return;
      }

      const subscription = await createStripeCardSubscription(paymentPayload);
      const cardConfirmationParams = {
        payment_method: {
          card: cardElementRef.current,
          billing_details: {
            email: formValues.email,
            name: formValues.cardholderName || 'FitZone Member'
          }
        }
      };
      const confirmation =
        subscription.intentType === 'setup'
          ? await stripeClient.confirmCardSetup(
              subscription.clientSecret,
              cardConfirmationParams
            )
          : await stripeClient.confirmCardPayment(
              subscription.clientSecret,
              cardConfirmationParams
            );

      if (confirmation.error) {
        throw new Error(
          confirmation.error.message ||
            'Stripe could not confirm the card payment.'
        );
      }

      if (
        isPaymentSuccessful(confirmation.paymentIntent) ||
        confirmation.setupIntent?.status === 'succeeded'
      ) {
        completePayment(
          'Card payment succeeded. Automatic monthly renewal is active. Redirecting to login...',
          confirmation.paymentIntent || { id: subscription.id }
        );
        return;
      }

      setPaymentStatus('idle');
      setPaymentMessage(
        `Stripe payment status: ${
          confirmation.paymentIntent?.status ||
          confirmation.setupIntent?.status ||
          'pending'
        }.`
      );
    } catch (error) {
      console.error(error);
      setPaymentStatus('idle');
      setPaymentMessage(error.message || 'Unable to complete Stripe payment.');
    }
  };

  return (
    <main className={pageClass}>
      <div className='pointer-events-none absolute -left-32 -top-24 h-116 w-116 rounded-full bg-[rgba(230,0,46,0.16)]'></div>
      <div className='pointer-events-none absolute -bottom-36 -right-6 h-108 w-108 rounded-full bg-[rgba(255,213,79,0.09)]'></div>

      <header
        className={`${containerClass} flex min-h-16 flex-col gap-3 rounded-3xl border border-[#3a3a3a] bg-[#181818] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6`}
      >
        <a
          className='inline-flex items-center gap-3.5 text-white no-underline'
          href='/'
        >
          <FitZoneLogo className='h-10 w-10' />
          <strong className='text-2xl'>FITZONE</strong>
        </a>
        <p className='m-0 text-[13px] font-black text-[#bdbdbd]'>
          Step 3: Complete your payment with Stripe sandbox
        </p>
      </header>

      <section className={`${containerClass} py-7`}>
        <span className='mb-3 block text-xs font-black uppercase text-[#e6002e]'>
          Secure Stripe Sandbox Checkout
        </span>
        <h1 className='m-0 mb-2 text-3xl leading-none sm:text-4xl'>
          Payment Details
        </h1>
        <p className='m-0 max-w-2xl text-[15px] leading-normal text-[#bdbdbd]'>
          Cards renew automatically each month. PromptPay renewals are paid
          manually.
        </p>
      </section>

      {status === 'loading' && (
        <p className={`${containerClass} py-20 text-center text-[#bdbdbd]`}>
          Loading selected plan...
        </p>
      )}
      {status === 'error' && (
        <p className={`${containerClass} py-20 text-center text-[#ff8ea2]`}>
          Payment setup is unavailable right now.
        </p>
      )}

      {status === 'ready' && selectedPlan && (
        <form
          className={`${containerClass} grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)]`}
          onSubmit={submitPayment}
        >
          <section className={`${cardClass} grid gap-5 p-5 sm:p-8`}>
            <h2 className='m-0 text-2xl'>Payment Method</h2>

            <div className='grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2'>
              {[
                ['card', 'Credit Card Auto Renewal'],
                ['promptpay', 'PromptPay']
              ].map(([method, label]) => (
                <button
                  className={`min-h-13 cursor-pointer rounded-2xl border px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-65 ${
                    paymentMethod === method
                      ? 'border-[#e6002e] bg-[#241216] text-white'
                      : 'border-[#414141] bg-[#2d2d2d] text-[#bdbdbd]'
                  }`}
                  disabled={isBusy || isPromptPayPending}
                  key={method}
                  onClick={() => {
                    setPaymentMethod(method);
                    setPaymentMessage('');
                    setPromptPayQrCode(null);
                  }}
                  type='button'
                >
                  {label}
                </button>
              ))}
            </div>

            {!isPromptPay && (
              <label className={labelClass}>
                <span className={labelTextClass}>Cardholder Name</span>
                <input
                  className={inputClass}
                  disabled={isBusy}
                  onChange={(event) =>
                    updateFormValue('cardholderName', event.target.value)
                  }
                  required
                  value={formValues.cardholderName}
                />
              </label>
            )}

            <label className={labelClass}>
              <span className={labelTextClass}>Clerk Account Email</span>
              <input
                className={inputClass}
                disabled={isBusy}
                readOnly
                required
                type='email'
                value={formValues.email}
              />
            </label>

            <label className={isPromptPay ? 'hidden' : labelClass}>
              <span className={labelTextClass}>Card Details</span>
              <div
                className='flex min-h-12 w-full flex-col justify-center rounded-2xl border border-[#414141] bg-[#2d2d2d] px-4'
                ref={cardMountRef}
              ></div>
            </label>

            {isPromptPay && (
              <div className='grid min-h-52 place-items-center rounded-2xl border border-dashed border-[#e6002e] bg-[#181818] p-5 text-center'>
                {promptPayQrCode ? (
                  <>
                    <img
                      alt='PromptPay QR code'
                      className='w-full max-w-64 rounded-2xl bg-white p-3'
                      src={
                        promptPayQrCode.image_url_svg ||
                        promptPayQrCode.image_url_png
                      }
                    />
                    <p className='mb-0 mt-3 text-[#bdbdbd]'>
                      Scan this QR code with your banking app.
                    </p>
                  </>
                ) : (
                  <p className='m-0 text-[#bdbdbd]'>
                    Generate a PromptPay QR code. PromptPay does not auto renew.
                  </p>
                )}
              </div>
            )}

            {!isStripeEnabled && (
              <p className={messageClass}>
                Add VITE_STRIPE_PUBLISHABLE_KEY to `.env`.
              </p>
            )}
            {stripeStatus === 'error' && (
              <p className={messageClass}>Stripe.js could not load.</p>
            )}
            {!isPromptPay && cardError && (
              <p className={messageClass}>{cardError}</p>
            )}
          </section>

          <aside className={`${cardClass} overflow-hidden p-5 sm:p-8`}>
            <h2 className='m-0 mb-5 text-2xl'>Order Summary</h2>
            <div className='grid gap-2 rounded-2xl border border-[#e6002e] p-5'>
              <span className='text-xs font-black text-[#e6002e]'>
                Selected Plan
              </span>
              <strong className='text-xl'>
                {selectedPlan.name} Membership
              </strong>
              <b className='text-[#ffd54f]'>
                {getPlanMonthlyLabel(selectedPlan)}/month
              </b>
            </div>

            <div className='grid gap-4 border-b border-[#3a3a3a] py-6'>
              <div className='flex items-center justify-between gap-4'>
                <span className='text-[#bdbdbd]'>Monthly plan</span>
                <strong>{getPlanMonthlyLabel(selectedPlan)}</strong>
              </div>
              <div className='flex items-center justify-between gap-4'>
                <span className='text-[#bdbdbd]'>Renewal</span>
                <strong className='text-right'>
                  {isPromptPay ? 'Manual payment' : 'Auto monthly charge'}
                </strong>
              </div>
            </div>

            <div className='flex items-center justify-between py-6'>
              <span className='text-sm font-black'>Total Today</span>
              <strong className='text-[#ffd54f]'>
                ฿{monthlyAmount.toLocaleString('en-US')}
              </strong>
            </div>

            {paymentMessage && (
              <p
                className={
                  paymentStatus === 'success'
                    ? successMessageClass
                    : messageClass
                }
              >
                {paymentMessage}
              </p>
            )}

            <button
              className='min-h-13 w-full cursor-pointer rounded-2xl border-0 bg-[#e6002e] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-65'
              disabled={isBusy || stripeStatus === 'loading'}
              type='submit'
            >
              {isBusy
                ? 'Processing...'
                : isPromptPayPending
                  ? 'Check PromptPay Status'
                  : isPromptPay
                    ? 'Generate PromptPay QR'
                    : 'Start Card Membership'}
            </button>
          </aside>
        </form>
      )}
    </main>
  );
}

function AuthenticatedPaymentPage() {
  const { user } = useUser();

  return <PaymentPageContent clerkEmail={getUserEmail(user)} />;
}

function PaymentPage({ clerkEnabled }) {
  return clerkEnabled ? <AuthenticatedPaymentPage /> : <PaymentPageContent />;
}

export default PaymentPage;
