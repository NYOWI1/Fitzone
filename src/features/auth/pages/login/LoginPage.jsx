import { useEffect, useState } from "react";
import {
  AuthenticateWithRedirectCallback,
  SignedIn,
  SignedOut,
  useSignIn,
  useUser,
} from "@clerk/clerk-react";
import RedirectSignedInUser from "../../components/RedirectSignedInUser";
import { AUTH_REDIRECT_AFTER_LOGIN, getAuthErrorMessage } from "../../authConfig";
import { getStripePaymentAccess } from "../../../../shared/api";

const authCard = "rounded-[30px] border border-[#3a3a3a] bg-[#242424] shadow-[0_24px_70px_rgba(0,0,0,0.5)] max-[640px]:rounded-[22px]";
const headingClass = "mb-0 mt-0 text-[clamp(32px,3.2vw,37px)] leading-[1.05] tracking-normal max-[640px]:text-[30px]";
const headingText = "m-0 max-w-[420px] text-base leading-[1.18] text-[#bdbdbd] max-[640px]:text-sm";
const fieldClass = "grid gap-2.5";
const labelClass = "text-[13px] font-black text-[#dedede]";
const inputClass = "min-h-[57px] w-full rounded-2xl border border-[#414141] bg-[#2d2d2d] px-[19px] font-[inherit] text-white placeholder:text-[#a8a8a8] focus:border-[#e6002e] focus:outline-none focus:shadow-[0_0_0_3px_rgba(230,0,46,0.12)] disabled:cursor-not-allowed disabled:opacity-65";
const messageClass = "mt-[-4px] rounded-[14px] border border-[rgba(230,0,46,0.35)] bg-[rgba(230,0,46,0.12)] px-3.5 py-3 text-[13px] leading-[1.4] text-[#ff8ea2]";
const primaryButton = "min-h-14 w-full cursor-pointer rounded-2xl border-0 bg-[#e6002e] text-[15px] font-black text-white shadow-[0_18px_28px_rgba(230,0,46,0.2)] transition hover:-translate-y-px hover:bg-[#ff1744] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0";
const secondaryButton = "cursor-pointer rounded-[14px] border border-[#414141] bg-[#2d2d2d] text-sm font-black text-[#f0f0f0] transition hover:border-[#e6002e] hover:bg-[#32151b] disabled:cursor-not-allowed disabled:opacity-65";

function SignedInLoginRedirect() {
  const { user } = useUser();
  const [redirectTo, setRedirectTo] = useState("");
  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress;

  useEffect(() => {
    let isCurrent = true;

    async function verifyPaymentAccess() {
      if (!email) {
        setRedirectTo("/choose-plan");
        return;
      }

      try {
        const access = await getStripePaymentAccess(email);

        if (isCurrent) {
          setRedirectTo(access.paid ? AUTH_REDIRECT_AFTER_LOGIN : "/choose-plan");
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setRedirectTo("/choose-plan");
        }
      }
    }

    verifyPaymentAccess();

    return () => {
      isCurrent = false;
    };
  }, [email]);

  return redirectTo ? <RedirectSignedInUser to={redirectTo} /> : null;
}

function LoginForm({ clerkEnabled }) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formStatus, setFormStatus] = useState("idle");
  const [formMessage, setFormMessage] = useState("");
  const [paymentRequired, setPaymentRequired] = useState(false);

  const isBusy = formStatus === "submitting" || formStatus === "redirecting";

  const handlePasswordSignIn = async (event) => {
    event.preventDefault();

    if (!clerkEnabled) {
      setFormMessage("Add VITE_CLERK_PUBLISHABLE_KEY to .env and restart the dev server.");
      return;
    }

    if (!isLoaded) {
      return;
    }

    try {
      setFormStatus("submitting");
      setFormMessage("");
      setPaymentRequired(false);

      const paymentAccess = await getStripePaymentAccess(email);

      if (!paymentAccess.paid) {
        setPaymentRequired(true);
        setFormMessage("Complete your membership payment before logging in.");
        return;
      }

      const signInAttempt = await signIn.create({
        identifier: email,
        password,
        strategy: "password",
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        window.location.href = AUTH_REDIRECT_AFTER_LOGIN;
        return;
      }

      setFormMessage("This account needs another verification step. Use your Clerk dashboard settings to enable password login only, or continue in Clerk.");
    } catch (error) {
      console.error(error);
      setFormMessage(getAuthErrorMessage(error));
    } finally {
      setFormStatus("idle");
    }
  };

  const handleSocialSignIn = async (strategy) => {
    if (!clerkEnabled) {
      setFormMessage("Add VITE_CLERK_PUBLISHABLE_KEY to .env and restart the dev server.");
      return;
    }

    if (!isLoaded) {
      return;
    }

    try {
      setFormStatus("redirecting");
      setFormMessage("");
      setPaymentRequired(false);
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: "/login/sso-callback",
        redirectUrlComplete: AUTH_REDIRECT_AFTER_LOGIN,
      });
    } catch (error) {
      console.error(error);
      setFormStatus("idle");
      setFormMessage(getAuthErrorMessage(error, "Unable to sign in. Check your details and try again."));
    }
  };

  const handleForgotPassword = () => {
    setFormMessage("Password reset can be added next. For now, use your Clerk dashboard account recovery options.");
  };

  return (
    <form className={`${authCard} grid w-[min(100%,532px)] gap-[18px] px-[35px] pb-[18px] pt-11 max-[640px]:px-5 max-[640px]:pb-[18px] max-[640px]:pt-[30px]`} onSubmit={handlePasswordSignIn}>
      <div>
        <h2 className={`${headingClass} mb-2`}>Login to your account</h2>
        <p className={headingText}>Enter your details below to access your FitZone dashboard.</p>
      </div>

      <label className={fieldClass}>
        <span className={labelClass}>Email</span>
        <input
          className={inputClass}
          autoComplete="email"
          disabled={isBusy}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="yourname@email.com"
          required
          type="email"
          value={email}
        />
      </label>

      <label className={fieldClass}>
        <span className={labelClass}>Password</span>
        <div className="grid min-h-[57px] grid-cols-[minmax(0,1fr)_auto] items-center overflow-hidden rounded-2xl border border-[#414141] bg-[#2d2d2d] focus-within:border-[#e6002e] focus-within:shadow-[0_0_0_3px_rgba(230,0,46,0.12)]">
          <input
            className="min-h-[55px] w-full border-0 bg-transparent px-[19px] font-[inherit] text-white placeholder:text-[#a8a8a8] focus:outline-none disabled:cursor-not-allowed disabled:opacity-65"
            autoComplete={remember ? "current-password" : "off"}
            disabled={isBusy}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            className="cursor-pointer bg-transparent px-[18px] text-[13px] font-black text-[#e6002e] disabled:cursor-not-allowed disabled:opacity-65"
            disabled={isBusy}
            onClick={() => setShowPassword((currentValue) => !currentValue)}
            type="button"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      <div className="my-1.5 mb-3 flex items-center justify-between gap-4 max-[640px]:items-start max-[640px]:flex-col">
        <label className="inline-flex items-center gap-3 text-[13px] text-[#bdbdbd]">
          <input
            className="h-[18px] w-[18px] accent-[#e6002e] disabled:cursor-not-allowed disabled:opacity-65"
            checked={remember}
            disabled={isBusy}
            onChange={(event) => setRemember(event.target.checked)}
            type="checkbox"
          />
          <span>Remember me</span>
        </label>
        <button className="cursor-pointer bg-transparent text-[13px] font-black text-[#e6002e] disabled:cursor-not-allowed disabled:opacity-65" onClick={handleForgotPassword} type="button">Forgot password?</button>
      </div>

      {formMessage && <p className={messageClass}>{formMessage}</p>}

      {paymentRequired && (
        <a className="inline-flex min-h-11 items-center justify-center rounded-[13px] border border-[#414141] bg-[#2d2d2d] text-[13px] font-black text-white no-underline transition hover:border-[#e6002e]" href="/choose-plan">
          Choose a plan and complete payment
        </a>
      )}

      <button className={primaryButton} disabled={isBusy} type="submit">
        {formStatus === "submitting" ? "Signing in..." : "Login"}
      </button>

      <div className="my-[13px] mb-1.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-[18px] text-[#bdbdbd]">
        <span className="h-px bg-[#424242]"></span>
        <p className="m-0 text-sm">or continue with</p>
        <span className="h-px bg-[#424242]"></span>
      </div>

      <div className="grid grid-cols-2 gap-7 max-[640px]:gap-3">
        <button
          className={`${secondaryButton} min-h-[49px]`}
          disabled={isBusy}
          onClick={() => handleSocialSignIn("oauth_google")}
          type="button"
        >
          Google
        </button>
        <button
          className={`${secondaryButton} min-h-[49px]`}
          disabled={isBusy}
          onClick={() => handleSocialSignIn("oauth_apple")}
          type="button"
        >
          Apple
        </button>
      </div>

      <p className="m-0 text-center text-[13px] text-[#bdbdbd]">
        Don't have an account? <a className="font-black text-[#e6002e] no-underline" href="/signup">Join FitZone</a>
      </p>
    </form>
  );
}

function LoginPage({ clerkEnabled }) {
  if (window.location.pathname.includes("/sso-callback")) {
    return <AuthenticateWithRedirectCallback />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0d0d0d] font-[Inter,Arial,sans-serif] text-white max-[1060px]:overflow-auto">
      <div className="pointer-events-none absolute left-[-210px] top-[70px] h-[480px] w-[560px] rounded-full bg-[rgba(230,0,46,0.15)]"></div>
      <div className="pointer-events-none absolute bottom-[-150px] right-[-110px] h-[430px] w-[430px] rounded-full bg-[rgba(230,0,46,0.15)]"></div>

      <section className="relative z-[1] grid min-h-screen grid-cols-[minmax(430px,520px)_minmax(430px,532px)] items-center justify-center gap-[clamp(46px,6vw,86px)] p-[clamp(28px,5vw,70px)] max-[1060px]:grid-cols-[minmax(0,620px)] max-[640px]:gap-[22px] max-[640px]:p-4">
        <aside className={`${authCard} relative flex min-h-[692px] flex-col overflow-hidden rounded-[30px] bg-[#181818] px-[42px] pb-14 pt-[46px] before:absolute before:left-0 before:right-0 before:top-0 before:h-[5px] before:bg-[#e6002e] max-[1060px]:min-h-[560px] max-[640px]:min-h-0 max-[640px]:rounded-[22px] max-[640px]:px-[22px] max-[640px]:py-[30px]`}>
          <a className="inline-flex w-fit items-center gap-4 text-white no-underline" href="/">
            <span className="grid h-[55px] w-[55px] place-items-center rounded-[18px] bg-[#e6002e] text-[26px] font-black max-[640px]:h-12 max-[640px]:w-12 max-[640px]:rounded-[14px]">F</span>
            <div>
              <strong className="block text-[29px] leading-none max-[640px]:text-2xl">FITZONE</strong>
              <small className="mt-1.5 block text-[11px] font-black text-[#e6002e]">GYM & FITNESS</small>
            </div>
          </a>

          <div className="mt-[84px] max-[640px]:mt-[54px]">
            <h1 className="mb-5 mt-0 max-w-[410px] text-[clamp(44px,4vw,50px)] leading-[1.18] tracking-normal max-[640px]:text-[38px]">Welcome back, champion.</h1>
            <p className="m-0 max-w-[410px] text-lg leading-[1.22] text-[#bababa] max-[640px]:text-[15px]">
              Sign in to manage your membership, book classes, track workouts,
              and continue your fitness journey with FitZone.
            </p>
          </div>

          <div className="mt-auto grid grid-cols-3 gap-[22px] max-[640px]:mt-[42px] max-[640px]:gap-3">
            {[
              ["24/7", "Member Access"],
              ["50+", "Weekly Classes"],
              ["4", "Expert Trainers"],
            ].map(([value, label]) => (
              <div className="grid min-h-[93px] items-center justify-items-center rounded-[20px] border border-[#3a3a3a] bg-[#252525] px-2.5 py-[18px] max-[640px]:min-h-[78px] max-[640px]:py-3.5" key={label}>
                <strong className="text-[27px] leading-none text-[#e6002e] max-[640px]:text-[21px]">{value}</strong>
                <span className="mt-2 text-center text-[11px] text-[#bdbdbd]">{label}</span>
              </div>
            ))}
          </div>

          <blockquote className="mb-0 mt-[52px] text-center text-[15px] font-black max-[640px]:mt-[34px] max-[640px]:text-[13px]">“Small progress every day adds up to big results.”</blockquote>
        </aside>

        <section className="flex min-w-0 items-center justify-center">
          {!clerkEnabled && (
            <div className={`${authCard} grid w-[min(100%,532px)] gap-[18px] px-[35px] pb-[18px] pt-11`}>
              <div>
                <h2 className={headingClass}>Connect Clerk</h2>
                <p className={headingText}>Add your Clerk publishable key to enable login.</p>
              </div>
              <code className="block overflow-wrap-anywhere rounded-[14px] border border-[#414141] bg-[#171717] p-3.5 text-[13px] text-white">VITE_CLERK_PUBLISHABLE_KEY=pk_test_...</code>
            </div>
          )}

          {clerkEnabled && (
            <>
              <SignedOut>
                <LoginForm clerkEnabled={clerkEnabled} />
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
