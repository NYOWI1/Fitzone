import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { isStripeEnabled, stripePublishableKey } from "../../../../app/config/stripe";
import { createStripePaymentIntent, getMembershipPlans } from "../../../../shared/api";
import { getPlanFromSelection, getPlanMonthlyLabel, getPlanPriceValue, saveSelectedPlan } from "../../shared/planSelection";
import "./PaymentPage.css";

const stripeScriptUrl = "https://js.stripe.com/v3/";

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

    const existingScript = document.querySelector(`script[src="${stripeScriptUrl}"]`);

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
  return user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
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
  const selectedPlan = useMemo(() => getPlanFromSelection(plans, selectedSlug), [plans, selectedSlug]);
  const monthlyAmount = getPlanPriceValue(selectedPlan);
  const amountInSatang = monthlyAmount * 100;
  const isBusy = paymentStatus === "saving";
  const isPromptPayPending = paymentStatus === "pending" && Boolean(promptPayClientSecret);
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

  const redirectAfterPayment = useCallback((message) => {
    setPaymentStatus("success");
    setPaymentMessage(message);
    window.setTimeout(() => {
      window.location.href = "/login";
    }, 900);
  }, []);

  const checkPromptPayStatus = useCallback(async ({ showPendingMessage = false } = {}) => {
    if (!stripeClient || !promptPayClientSecret) {
      return false;
    }

    const result = await stripeClient.retrievePaymentIntent(promptPayClientSecret);

    if (result.error) {
      if (showPendingMessage) {
        setPaymentMessage(result.error.message || "Unable to check PromptPay status.");
      }
      return false;
    }

    const nextStatus = result.paymentIntent?.status || "pending";

    if (isPaymentSuccessful(result.paymentIntent)) {
      redirectAfterPayment("PromptPay payment succeeded. Redirecting to login...");
      return true;
    }

    if (["requires_payment_method", "canceled"].includes(nextStatus)) {
      setPaymentStatus("idle");
      setPaymentMessage(`PromptPay payment status: ${nextStatus}.`);
      return true;
    }

    if (showPendingMessage) {
      setPaymentMessage(`PromptPay payment status: ${nextStatus}. Waiting for confirmation.`);
    }

    return false;
  }, [promptPayClientSecret, redirectAfterPayment, stripeClient]);

  const submitPayment = async (event) => {
    event.preventDefault();

    if (!selectedPlan) {
      setPaymentMessage("Choose a membership plan before paying.");
      return;
    }

    if (!isStripeEnabled) {
      setPaymentMessage("Add VITE_STRIPE_PUBLISHABLE_KEY to .env and restart Vite.");
      return;
    }

    if (stripeStatus !== "ready" || !stripeClient) {
      setPaymentMessage("Stripe is still loading. Try again in a moment.");
      return;
    }

    if (!isPromptPaySelected && (!cardComplete || !cardElementRef.current)) {
      setPaymentMessage(cardError || "Enter a complete sandbox card number before paying.");
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

      const paymentIntent = await createStripePaymentIntent({
        amount: amountInSatang,
        currency: "thb",
        description: `FitZone ${selectedPlan.name} Membership - ${cardValues.cardholderName || "FitZone Member"}`,
        plan: selectedPlan.name,
        planSlug: selectedPlan.slug,
        member: cardValues.cardholderName || "FitZone Member",
        memberEmail: cardValues.email,
        paymentMethodType: paymentMethod,
      });

      if (isPromptPaySelected) {
        if (typeof stripeClient.confirmPromptPayPayment !== "function") {
          throw new Error("PromptPay is not available in this Stripe.js version.");
        }

        const confirmation = await stripeClient.confirmPromptPayPayment(paymentIntent.clientSecret, {
          payment_method: {
            billing_details: {
              email: cardValues.email,
              name: cardValues.cardholderName || "FitZone Member",
            },
          },
        });

        if (confirmation.error) {
          throw new Error(confirmation.error.message || "Stripe could not create a PromptPay QR code.");
        }

        if (isPaymentSuccessful(confirmation.paymentIntent)) {
          redirectAfterPayment("PromptPay payment succeeded. Redirecting to login...");
          return;
        }

        const qrCode = getPromptPayQrCode(confirmation.paymentIntent);

        if (!qrCode) {
          throw new Error("Stripe did not return a PromptPay QR code.");
        }

        setPromptPayQrCode(qrCode);
        setPromptPayClientSecret(paymentIntent.clientSecret);
        setPaymentStatus("pending");
        setPaymentMessage("Scan the PromptPay QR code in your banking app, then wait for confirmation.");
        return;
      }

      const confirmation = await stripeClient.confirmCardPayment(paymentIntent.clientSecret, {
        payment_method: {
          card: cardElementRef.current,
          billing_details: {
            email: cardValues.email,
            name: cardValues.cardholderName || "FitZone Member",
          },
        },
      });

      if (confirmation.error) {
        throw new Error(confirmation.error.message || "Stripe could not confirm the payment.");
      }

      const paymentSucceeded = isPaymentSuccessful(confirmation.paymentIntent);

      setPaymentStatus("success");
      setPaymentMessage(paymentSucceeded
        ? "Stripe sandbox payment succeeded. Redirecting to login..."
        : `Stripe payment status: ${confirmation.paymentIntent?.status || "pending"}.`);

      if (paymentSucceeded) {
        redirectAfterPayment("Stripe sandbox payment succeeded. Redirecting to login...");
      }
    } catch (error) {
      console.error(error);
      setPaymentStatus("idle");
      setPaymentMessage(error.message || "Unable to complete Stripe sandbox payment.");
    }
  };

  useEffect(() => {
    if (paymentStatus !== "pending" || !promptPayClientSecret || !stripeClient) {
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
          setPaymentMessage("PromptPay payment is still pending. Click Check PromptPay Status after paying.");
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
  }, [checkPromptPayStatus, paymentStatus, promptPayClientSecret, stripeClient]);

  return (
    <main className="payment-page">
      <div className="payment-bg payment-bg-left"></div>
      <div className="payment-bg payment-bg-right"></div>
      <div className="payment-bg payment-bg-gold"></div>

      <header className="flow-nav payment-nav">
        <a className="flow-brand" href="/">
          <span>F</span>
          <strong>FITZONE</strong>
        </a>
        <p>Step 3: Complete your payment with Stripe sandbox</p>
      </header>

      <section className="payment-heading">
        <span>Secure Stripe Sandbox Checkout</span>
        <h1>Payment Details</h1>
        <p>Finish your membership setup through Stripe sandbox. Card details stay inside Stripe Elements before the payment is confirmed.</p>
      </section>

      {status === "loading" && <p className="payment-state">Loading selected plan...</p>}
      {status === "error" && <p className="payment-state error">Payment setup is unavailable right now.</p>}

      {status === "ready" && selectedPlan && (
        <form className="payment-layout" onSubmit={submitPayment}>
          <section className="payment-method-card">
            <h2>Payment Method</h2>

            <div className="payment-method-tabs" aria-label="Payment method">
              <button
                className={paymentMethod === "card" ? "active" : ""}
                disabled={isBusy || isPromptPayPending}
                onClick={() => {
                  setPaymentMethod("card");
                  setPromptPayQrCode(null);
                  setPaymentMessage("");
                }}
                type="button"
              >
                <span aria-hidden="true">💳</span>
                Credit Card
              </button>
              <button
                className={paymentMethod === "promptpay" ? "active" : ""}
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

            <div className="payment-fields">
              <label>
                <span>Cardholder Name</span>
                <input
                  disabled={isBusy}
                  onChange={(event) => updateCardValue("cardholderName", event.target.value)}
                  required
                  value={cardValues.cardholderName}
                />
              </label>

              <label>
                <span>Clerk Account Email</span>
                <input
                  disabled={isBusy || Boolean(clerkEmail)}
                  onChange={(event) => updateCardValue("email", event.target.value)}
                  placeholder="yourname@email.com"
                  required
                  type="email"
                  value={cardValues.email}
                />
              </label>

              <label className={isPromptPaySelected ? "hidden-stripe-card-field" : ""}>
                <span>Card Details</span>
                <div className="stripe-card-element" ref={cardMountRef}></div>
              </label>
            </div>

            {isPromptPaySelected && (
              <div className="payment-promptpay">
                <div className="payment-qr-box">
                  {promptPayQrCode ? (
                    <>
                      <img
                        alt="PromptPay QR code"
                        src={promptPayQrCode.image_url_svg || promptPayQrCode.image_url_png}
                      />
                      <p>Scan this QR code with your banking app to complete payment.</p>
                    </>
                  ) : (
                    <>
                      <strong>PromptPay QR</strong>
                      <p>Generate a secure PromptPay QR code, then scan it with your banking app.</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {!isStripeEnabled && (
              <p className="payment-message">
                Add VITE_STRIPE_PUBLISHABLE_KEY to `.env`.
              </p>
            )}

            {stripeStatus === "error" && (
              <p className="payment-message">
                Stripe.js could not load. Check your internet connection and publishable key.
              </p>
            )}

            {!isPromptPaySelected && cardError && <p className="payment-message">{cardError}</p>}

          </section>

          <aside className="payment-summary-card">
            <h2>Order Summary</h2>
            <div className="payment-selected-plan">
              <span>Selected Plan</span>
              <strong>{selectedPlan.name} Membership</strong>
              <b>{getPlanMonthlyLabel(selectedPlan)}/month</b>
            </div>

            <div className="payment-summary-lines">
              <div>
                <span>Monthly plan</span>
                <strong>{getPlanMonthlyLabel(selectedPlan)}</strong>
              </div>
              <div>
                <span>Registration fee</span>
                <strong>฿0</strong>
              </div>
            </div>

            <div className="payment-total-line">
              <span>Total Today</span>
              <strong>฿{monthlyAmount.toLocaleString("en-US")}</strong>
            </div>

            {paymentMessage && (
              <p className={paymentStatus === "success" ? "payment-message success" : "payment-message"}>
                {paymentMessage}
              </p>
            )}

            <button disabled={isBusy || stripeStatus === "loading"} type="submit">
              {isBusy ? "Processing..." : isPromptPayPending ? "Check PromptPay Status" : isPromptPaySelected ? "Generate PromptPay QR" : "Pay with Stripe"}
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
