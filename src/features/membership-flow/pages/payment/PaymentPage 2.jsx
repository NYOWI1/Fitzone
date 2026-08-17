import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import {
  isStripeEnabled,
  stripePublishableKey,
} from "../../../../app/config/stripe";
import {
  createStripeCardSubscription,
  createStripePaymentIntent,
  getMembershipPlans,
} from "../../../../shared/api";
import {
  getPlanFromSelection,
  getPlanMonthlyLabel,
  getPlanPriceValue,
  savePaidMembershipAccess,
  saveSelectedPlan,
} from "../../shared/planSelection";

const stripeScriptUrl = "https://js.stripe.com/v3/";
const pageContent = "relative z-[1] mx-auto max-w-[1120px]";
const flowNav = `${pageContent} flex min-h-[66px] items-center justify-between rounded-[22px] border border-[#3a3a3a] bg-[#181818] py-3 pl-6 pr-7 max-[640px]:items-start max-[640px]:flex-col max-[640px]:gap-3.5 max-[640px]:p-[18px]`;
const flowBrand = "inline-flex items-center gap-3.5 text-white no-underline";
const panelCard =
  "rounded-[22px] border border-[#3a3a3a] bg-[#252525] shadow-[0_24px_70px_rgba(0,0,0,0.48)] sm:rounded-[30px]";
const fieldLabel = "grid gap-2.5";
const fieldLabelText = "text-xs font-black text-[#dedede]";
const inputClass =
  "min-h-[50px] w-full rounded-[14px] border border-[#414141] bg-[#2d2d2d] px-[18px] font-[inherit] text-white placeholder:text-[#a8a8a8] focus:border-[#e6002e] focus:outline-none focus:shadow-[0_0_0_3px_rgba(230,0,46,0.12)] disabled:cursor-not-allowed disabled:opacity-65";
const stripeCardClass =
  "flex min-h-[50px] w-full flex-col justify-center rounded-[14px] border border-[#414141] bg-[#2d2d2d] px-[18px] focus-within:border-[#e6002e] focus-within:outline-none focus-within:shadow-[0_0_0_3px_rgba(230,0,46,0.12)]";
const paymentMessageClass =
  "mb-3.5 mt-0 rounded-[14px] border border-[rgba(230,0,46,0.35)] bg-[rgba(230,0,46,0.12)] px-3.5 py-3 text-[13px] leading-[1.4] text-[#ff8ea2]";
const successMessageClass =
  "mb-3.5 mt-0 rounded-[14px] border border-[rgba(57,230,0,0.28)] bg-[rgba(57,230,0,0.1)] px-3.5 py-3 text-[13px] leading-[1.4] text-[#a6ff8f]";

function isPaymentSuccessful(paymentIntent) {
  return String(paymentIntent?.status || "").toLowerCase() === "succeeded";
}

function getPromptPayQrCode(paymentIntent) {
  return paymentIntent?.next_action?.promptpay_display_qr_code || null;
}

function loadStripeScript() {
  return new Promise((resolve, reject) => {
    if (window.Stripe) {
      resolve(window.Stripe);
      return;
    }

    const existingScript = document.querySelector(
      `script[src="${stripeScriptUrl}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.Stripe));
      existingScript.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = stripeScriptUrl;
    script.async = true;
    script.onload = () => resolve(window.Stripe);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function getUserEmail(user) {
  return (
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    ""
  );
}

function PaymentPageContent({ clerkEmail = "" }) {
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState("loading");
  const [stripeStatus, setStripeStatus] = useState("idle");
  const [stripeClient, setStripeClient] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [promptPayQrCode, setPromptPayQrCode] = useState(null);
  const [promptPayClientSecret, setPromptPayClientSecret] = useState("");
  const [cardValues, setCardValues] = useState({
    cardholderName: "",
    email: clerkEmail,
  });
  const cardMountRef = useRef(null);
  const cardElementRef = useRef(null);

  const selectedSlug = new URLSearchParams(window.location.search).get("plan");
  const selectedPlan = useMemo(
    () => getPlanFromSelection(plans, selectedSlug),
    [plans, selectedSlug],
  );
  const monthlyAmount = getPlanPriceValue(selectedPlan);
  const amountInSatang = monthlyAmount * 100;
  const isBusy = paymentStatus === "saving";
  const isPromptPayPending =
    paymentStatus === "pending" && Boolean(promptPayClientSecret);
  const isPromptPaySelected = paymentMethod === "promptpay";

  useEffect(() => {
    let isCurrent = true;

    async function loadPlans() {
      try {
        const nextPlans = await getMembershipPlans();

        if (isCurrent) {
          setPlans(nextPlans.filter((plan) => plan.active !== false));
          setStatus("ready");
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setPlans([]);
          setStatus("error");
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
    if (clerkEmail) {
      updateCardValue("email", clerkEmail);
    }
  }, [clerkEmail]);

  useEffect(() => {
    if (!isStripeEnabled || status !== "ready" || !selectedPlan) {
      return;
    }

    let isCurrent = true;
    let nextCardElement = null;

    async function prepareStripe() {
      try {
        setStripeStatus("loading");
        const Stripe = await loadStripeScript();
        const nextStripeClient = Stripe(stripePublishableKey);
        const elements = nextStripeClient.elements();

        nextCardElement = elements.create("card", {
          hidePostalCode: true,
          style: {
            base: {
              color: "#ffffff",
              fontFamily: "Inter, Arial, sans-serif",
              fontSize: "16px",
              "::placeholder": {
                color: "#a8a8a8",
              },
            },
            invalid: {
              color: "#ff8ea2",
            },
          },
        });

        nextCardElement.on("change", (event) => {
          if (!isCurrent) {
            return;
          }

          setCardComplete(event.complete);
          setCardError(event.error?.message || "");
        });

        if (cardMountRef.current) {
          nextCardElement.mount(cardMountRef.current);
          cardElementRef.current = nextCardElement;
        }

        if (isCurrent) {
          setStripeClient(nextStripeClient);
          setStripeStatus("ready");
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setStripeStatus("error");
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

  const updateCardValue = (field, value) => {
    setCardValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const redirectAfterPayment = useCallback(
    (message, paymentIntent = null) => {
      savePaidMembershipAccess({
        email: cardValues.email,
        memberName: cardValues.cardholderName,
        paymentIntentId: paymentIntent?.id || "",
        plan: selectedPlan,
      });
      setPaymentStatus("success");
      setPaymentMessage(message);
      window.setTimeout(() => {
        window.location.href = "/login";
      }, 900);
    },
    [cardValues.cardholderName, cardValues.email, selectedPlan],
  );

  const checkPromptPayStatus = useCallback(
    async ({ showPendingMessage = false } = {}) => {
      if (!stripeClient || !promptPayClientSecret) {
        return false;
      }

      const result = await stripeClient.retrievePaymentIntent(
        promptPayClientSecret,
      );

      if (result.error) {
        if (showPendingMessage) {
          setPaymentMessage(
            result.error.message || "Unable to check PromptPay status.",
          );
        }
        return false;
      }

      const nextStatus = result.paymentIntent?.status || "pending";

      if (isPaymentSuccessful(result.paymentIntent)) {
        redirectAfterPayment(
          "PromptPay payment succeeded. Redirecting to login...",
          result.paymentIntent,
        );
        return true;
      }

      if (["requires_payment_method", "canceled"].includes(nextStatus)) {
        setPaymentStatus("idle");
        setPaymentMessage(`PromptPay payment status: ${nextStatus}.`);
        return true;
      }

      if (showPendingMessage) {
        setPaymentMessage(
          `PromptPay payment status: ${nextStatus}. Waiting for confirmation.`,
        );
      }

      return false;
    },
    [promptPayClientSecret, redirectAfterPayment, stripeClient],
  );

  const submitPayment = async (event) => {
    event.preventDefault();

    if (!selectedPlan) {
      setPaymentMessage("Choose a membership plan before paying.");
      return;
    }

    if (!isStripeEnabled) {
      setPaymentMessage(
        "Add VITE_STRIPE_PUBLISHABLE_KEY to .env and restart Vite.",
      );
      return;
    }

    if (stripeStatus !== "ready" || !stripeClient) {
      setPaymentMessage("Stripe is still loading. Try again in a moment.");
      return;
    }

    if (!isPromptPaySelected && (!cardComplete || !cardElementRef.current)) {
      setPaymentMessage(
        cardError || "Enter a complete sandbox card number before paying.",
      );
      return;
    }

    if (!cardValues.email.trim()) {
      setPaymentMessage("A Clerk account email is required before payment.");
      return;
    }

    if (isPromptPaySelected && isPromptPayPending) {
      await checkPromptPayStatus({ showPendingMessage: true });
      return;
    }

    try {
      setPaymentStatus("saving");
      setPaymentMessage("");
      setPromptPayQrCode(null);
      setPromptPayClientSecret("");

      const paymentPayload = {
        amount: amountInSatang,
        currency: "thb",
        description: `FitZone ${selectedPlan.name} Membership - ${cardValues.cardholderName || "FitZone Member"}`,
        plan: selectedPlan.name,
        planSlug: selectedPlan.slug,
        member: cardValues.cardholderName || "FitZone Member",
        memberEmail: cardValues.email,
      };

      if (isPromptPaySelected) {
        const paymentIntent = await createStripePaymentIntent({
          ...paymentPayload,
          paymentMethodType: "promptpay",
        });

        if (typeof stripeClient.confirmPromptPayPayment !== "function") {
          throw new Error(
            "PromptPay is not available in this Stripe.js version.",
          );
        }

        const confirmation = await stripeClient.confirmPromptPayPayment(
          paymentIntent.clientSecret,
          {
            payment_method: {
              billing_details: {
                email: cardValues.email,
                name: cardValues.cardholderName || "FitZone Member",
              },
            },
          },
        );

        if (confirmation.error) {
          throw new Error(
            confirmation.error.message ||
              "Stripe could not create a PromptPay QR code.",
          );
        }

        if (isPaymentSuccessful(confirmation.paymentIntent)) {
          redirectAfterPayment(
            "PromptPay payment succeeded. Redirecting to login...",
            confirmation.paymentIntent,
          );
          return;
        }

        const qrCode = getPromptPayQrCode(confirmation.paymentIntent);

        if (!qrCode) {
          throw new Error("Stripe did not return a PromptPay QR code.");
        }

        setPromptPayQrCode(qrCode);
        setPromptPayClientSecret(paymentIntent.clientSecret);
        setPaymentStatus("pending");
        setPaymentMessage(
          "Scan the PromptPay QR code in your banking app, then wait for confirmation.",
        );
        return;
      }

      const subscription = await createStripeCardSubscription(paymentPayload);
      const confirmation = await stripeClient.confirmCardPayment(
        subscription.clientSecret,
        {
          payment_method: {
            card: cardElementRef.current,
            billing_details: {
              email: cardValues.email,
              name: cardValues.cardholderName || "FitZone Member",
            },
          },
        },
      );

      if (confirmation.error) {
        throw new Error(
          confirmation.error.message || "Stripe could not confirm the payment.",
        );
      }

      const paymentSucceeded = isPaymentSuccessful(confirmation.paymentIntent);

      setPaymentStatus("success");
      setPaymentMessage(
        paymentSucceeded
          ? "Card payment succeeded. Automatic monthly renewal is active. Redirecting to login..."
          : `Stripe payment status: ${confirmation.paymentIntent?.status || "pending"}.`,
      );

      if (paymentSucceeded) {
        redirectAfterPayment(
          "Card payment succeeded. Automatic monthly renewal is active. Redirecting to login...",
          confirmation.paymentIntent,
        );
      }
    } catch (error) {
      console.error(error);
      setPaymentStatus("idle");
      setPaymentMessage(
        error.message || "Unable to complete Stripe sandbox payment.",
      );
    }
  };

  useEffect(() => {
    if (
      paymentStatus !== "pending" ||
      !promptPayClientSecret ||
      !stripeClient
    ) {
      return undefined;
    }

    let attempts = 0;
    const intervalId = window.setInterval(async () => {
      attempts += 1;

      try {
        const isComplete = await checkPromptPayStatus();

        if (isComplete) {
          window.clearInterval(intervalId);
        } else if (attempts >= 60) {
          window.clearInterval(intervalId);
          setPaymentMessage(
            "PromptPay payment is still pending. Click Check PromptPay Status after paying.",
          );
        }
      } catch (error) {
        console.error(error);
      }
    }, 3000);

    const checkOnFocus = () => {
      checkPromptPayStatus({ showPendingMessage: true }).catch((error) => {
        console.error(error);
      });
    };

    window.addEventListener("focus", checkOnFocus);
    document.addEventListener("visibilitychange", checkOnFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", checkOnFocus);
      document.removeEventListener("visibilitychange", checkOnFocus);
    };
  }, [
    checkPromptPayStatus,
    paymentStatus,
    promptPayClientSecret,
    stripeClient,
  ]);

  return (
    <main className="relative min-h-screen overflow-x-hidden overflow-y-auto bg-[#0d0d0d] p-4 font-[Inter,Arial,sans-serif] text-white sm:px-6 sm:py-7 lg:px-[clamp(28px,5vw,70px)] lg:py-9">
      <div className="pointer-events-none absolute -left-[130px] -top-[92px] h-[470px] w-[470px] rounded-full bg-[rgba(230,0,46,0.16)]"></div>
      <div className="pointer-events-none absolute -right-[90px] -top-[126px] h-[340px] w-[340px] rounded-full bg-[rgba(230,0,46,0.15)]"></div>
      <div className="pointer-events-none absolute -bottom-[145px] -right-[22px] h-[430px] w-[430px] rounded-full bg-[rgba(255,213,79,0.09)]"></div>

      <header className={flowNav}>
        <a className={flowBrand} href="/">
          <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#e6002e] text-[21px] font-black">
            F
          </span>
          <strong className="text-[23px] tracking-normal">FITZONE</strong>
        </a>
        <p className="m-0 text-[13px] font-black text-[#bdbdbd]">
          Step 3: Complete your payment with Stripe sandbox
        </p>
      </header>

      <section className={`${pageContent} py-6 pb-7 max-[640px]:py-7`}>
        <span className="mb-3.5 block text-xs font-black uppercase text-[#e6002e]">
          Secure Stripe Sandbox Checkout
        </span>
        <h1 className="mb-2 mt-0 text-3xl leading-[1.05] tracking-normal sm:text-[38px] lg:text-[clamp(38px,4vw,46px)]">
          Payment Details
        </h1>
        <p className="m-0 text-[15px] leading-[1.45] text-[#bdbdbd]">
          Finish your membership setup through Stripe sandbox. Cards renew
          automatically each month; PromptPay renewals are paid manually.
        </p>
      </section>

      {status === "loading" && (
        <p
          className={`${pageContent} py-[90px] text-center text-[15px] leading-[1.45] text-[#bdbdbd]`}
        >
          Loading selected plan...
        </p>
      )}
      {status === "error" && (
        <p
          className={`${pageContent} py-[90px] text-center text-[15px] leading-[1.45] text-[#ff8ea2]`}
        >
          Payment setup is unavailable right now.
        </p>
      )}

      {status === "ready" && selectedPlan && (
        <form
          className={`${pageContent} grid grid-cols-[minmax(0,1.45fr)_minmax(330px,0.82fr)] items-start gap-8 max-[1040px]:grid-cols-1`}
          onSubmit={submitPayment}
        >
          <section className={`${panelCard} min-h-[430px] px-4 py-5 sm:px-[38px] sm:py-[34px]`}>
            <h2 className="mb-[18px] mt-0 text-[22px] tracking-normal sm:mb-[22px] sm:text-[25px]">
              Payment Method
            </h2>

            <div
              className="mb-7 grid max-w-[410px] grid-cols-2 gap-2.5 max-[640px]:grid-cols-1 max-[640px]:gap-3.5"
              aria-label="Payment method"
            >
              <button
                className={`inline-flex min-h-[54px] cursor-pointer items-center justify-center gap-2.5 rounded-[14px] border bg-[#2d2d2d] text-[15px] font-black transition disabled:cursor-not-allowed disabled:opacity-65 ${paymentMethod === "card" ? "border-[#e6002e] bg-[#242424] text-white shadow-[inset_0_0_0_1px_rgba(230,0,46,0.38)]" : "border-[#414141] text-[#bdbdbd]"}`}
                disabled={isBusy || isPromptPayPending}
                onClick={() => {
                  setPaymentMethod("card");
                  setPromptPayQrCode(null);
                  setPaymentMessage("");
                }}
                type="button"
              >
                <span aria-hidden="true">💳</span>
                Credit Card Auto Renewal
              </button>
              <button
                className={`inline-flex min-h-[54px] cursor-pointer items-center justify-center gap-2.5 rounded-[14px] border bg-[#2d2d2d] text-[15px] font-black transition disabled:cursor-not-allowed disabled:opacity-65 ${paymentMethod === "promptpay" ? "border-[#e6002e] bg-[#242424] text-white shadow-[inset_0_0_0_1px_rgba(230,0,46,0.38)]" : "border-[#414141] text-[#bdbdbd]"}`}
                disabled={isBusy || isPromptPayPending}
                onClick={() => {
                  setPaymentMethod("promptpay");
                  setCardError("");
                  setPaymentMessage("");
                }}
                type="button"
              >
                <span aria-hidden="true">▦</span>
                PromptPay
              </button>
            </div>

            <div className="grid gap-4 sm:gap-[18px]">
              {!isPromptPaySelected && (
                <label className={fieldLabel}>
                  <span className={fieldLabelText}>Cardholder Name</span>
                  <input
                    className={inputClass}
                    disabled={isBusy}
                    onChange={(event) =>
                      updateCardValue("cardholderName", event.target.value)
                    }
                    required
                    value={cardValues.cardholderName}
                  />
                </label>
              )}

              <label className={fieldLabel}>
                <span className={fieldLabelText}>Clerk Account Email</span>
                <input
                  className={inputClass}
                  disabled={isBusy || Boolean(clerkEmail)}
                  onChange={(event) =>
                    updateCardValue("email", event.target.value)
                  }
                  placeholder="yourname@email.com"
                  required
                  type="email"
                  value={cardValues.email}
                />
              </label>

              <label
                className={
                  isPromptPaySelected
                    ? "pointer-events-none m-0 h-0 overflow-hidden opacity-0"
                    : fieldLabel
                }
              >
                <span className={fieldLabelText}>Card Details</span>
                <div className={stripeCardClass} ref={cardMountRef}></div>
              </label>
            </div>

            {isPromptPaySelected && (
              <div className="grid gap-[18px]">
                <div className="grid min-h-[208px] place-items-center rounded-[18px] border border-dashed border-[#e6002e] bg-[#181818] p-4 text-center sm:p-6">
                  {promptPayQrCode ? (
                    <>
                      <img
                        className="block h-auto w-full max-w-[min(260px,100%)] rounded-[14px] bg-white p-3"
                        alt="PromptPay QR code"
                        src={
                          promptPayQrCode.image_url_svg ||
                          promptPayQrCode.image_url_png
                        }
                      />
                      <p className="mb-0 mt-2 text-[#bdbdbd]">
                        Scan this QR code with your banking app to complete
                        payment.
                      </p>
                    </>
                  ) : (
                    <>
                      <strong className="text-2xl">PromptPay QR</strong>
                      <p className="mb-0 mt-2 text-[#bdbdbd]">
                        Generate a secure PromptPay QR code, then scan it with
                        your banking app. PromptPay does not auto renew.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {!isStripeEnabled && (
              <p className={paymentMessageClass}>
                Add VITE_STRIPE_PUBLISHABLE_KEY to `.env`.
              </p>
            )}

            {stripeStatus === "error" && (
              <p className={paymentMessageClass}>
                Stripe.js could not load. Check your internet connection and
                publishable key.
              </p>
            )}

            {!isPromptPaySelected && cardError && (
              <p className={paymentMessageClass}>{cardError}</p>
            )}
          </section>

          <aside
            className={`${panelCard} relative overflow-hidden px-4 py-5 before:absolute before:left-0 before:right-0 before:top-0 before:h-[5px] before:bg-[#e6002e] sm:px-8 sm:py-[34px]`}
          >
            <h2 className="mb-[18px] mt-0 text-[22px] tracking-normal sm:mb-[22px] sm:text-[25px]">
              Order Summary
            </h2>
            <div className="grid gap-2 rounded-[18px] border border-[#e6002e] px-4 py-[18px] sm:px-6 sm:py-[22px]">
              <span className="text-xs font-black text-[#e6002e]">
                Selected Plan
              </span>
              <strong className="min-w-0 break-words text-xl sm:text-[22px]">
                {selectedPlan.name} Membership
              </strong>
              <b className="text-[15px] text-[#ffd54f]">
                {getPlanMonthlyLabel(selectedPlan)}/month
              </b>
            </div>

            <div className="grid gap-[18px] border-b border-[#3a3a3a] py-[26px] pb-[42px]">
              <div className="flex min-w-0 items-center justify-between gap-4">
                <span className="text-[#bdbdbd]">Monthly plan</span>
                <strong className="shrink-0 font-medium text-white">
                  {getPlanMonthlyLabel(selectedPlan)}
                </strong>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-4">
                <span className="text-[#bdbdbd]">Renewal</span>
                <strong className="min-w-0 truncate text-right font-medium text-white">
                  {isPromptPaySelected ? "Manual payment" : "Auto monthly charge"}
                </strong>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-4">
                <span className="text-[#bdbdbd]">Registration fee</span>
                <strong className="shrink-0 font-medium text-white">฿0</strong>
              </div>
            </div>

            <div className="flex items-center justify-between py-6">
              <span className="text-sm font-black">Total Today</span>
              <strong className="text-[#ffd54f]">
                ฿{monthlyAmount.toLocaleString("en-US")}
              </strong>
            </div>

            {paymentMessage && (
              <p
                className={
                  paymentStatus === "success"
                    ? successMessageClass
                    : paymentMessageClass
                }
              >
                {paymentMessage}
              </p>
            )}

            <button
              className="mt-1 inline-flex min-h-[54px] w-full cursor-pointer items-center justify-center rounded-[13px] border-0 bg-[#e6002e] text-[15px] font-black text-white no-underline disabled:cursor-not-allowed disabled:opacity-65"
              disabled={isBusy || stripeStatus === "loading"}
              type="submit"
            >
              {isBusy
                ? "Processing..."
                : isPromptPayPending
                  ? "Check PromptPay Status"
                  : isPromptPaySelected
                    ? "Generate PromptPay QR"
                    : "Start Card Membership"}
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
