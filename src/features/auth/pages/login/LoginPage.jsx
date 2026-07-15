import { useEffect, useState } from "react";
import {
  AuthenticateWithRedirectCallback,
  SignedIn,
  SignedOut,
  useSignIn,
  useUser,
} from "@clerk/clerk-react";
import "./LoginPage.css";
import RedirectSignedInUser from "../../components/RedirectSignedInUser";
import { AUTH_REDIRECT_AFTER_LOGIN, getAuthErrorMessage } from "../../authConfig";
import { getStripePaymentAccess } from "../../../../shared/api";

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
    <form className="fitzone-login-card" onSubmit={handlePasswordSignIn}>
      <div className="fitzone-login-heading">
        <h2>Login to your account</h2>
        <p>Enter your details below to access your FitZone dashboard.</p>
      </div>

      <label className="fitzone-field">
        <span>Email</span>
        <input
          autoComplete="email"
          disabled={isBusy}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="yourname@email.com"
          required
          type="email"
          value={email}
        />
      </label>

      <label className="fitzone-field">
        <span>Password</span>
        <div className="fitzone-password-field">
          <input
            autoComplete={remember ? "current-password" : "off"}
            disabled={isBusy}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            disabled={isBusy}
            onClick={() => setShowPassword((currentValue) => !currentValue)}
            type="button"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      <div className="fitzone-login-options">
        <label>
          <input
            checked={remember}
            disabled={isBusy}
            onChange={(event) => setRemember(event.target.checked)}
            type="checkbox"
          />
          <span>Remember me</span>
        </label>
        <button onClick={handleForgotPassword} type="button">Forgot password?</button>
      </div>

      {formMessage && <p className="fitzone-login-message">{formMessage}</p>}

      {paymentRequired && (
        <a className="fitzone-payment-required-link" href="/choose-plan">
          Choose a plan and complete payment
        </a>
      )}

      <button className="fitzone-login-submit" disabled={isBusy} type="submit">
        {formStatus === "submitting" ? "Signing in..." : "Login"}
      </button>

      <div className="fitzone-divider">
        <span></span>
        <p>or continue with</p>
        <span></span>
      </div>

      <div className="fitzone-social-grid">
        <button
          disabled={isBusy}
          onClick={() => handleSocialSignIn("oauth_google")}
          type="button"
        >
          Google
        </button>
        <button
          disabled={isBusy}
          onClick={() => handleSocialSignIn("oauth_apple")}
          type="button"
        >
          Apple
        </button>
      </div>

      <p className="fitzone-join-text">
        Don't have an account? <a href="/signup">Join FitZone</a>
      </p>
    </form>
  );
}

function LoginPage({ clerkEnabled }) {
  if (window.location.pathname.includes("/sso-callback")) {
    return <AuthenticateWithRedirectCallback />;
  }

  return (
    <main className="fitzone-login-page">
      <div className="fitzone-bg-shape fitzone-bg-left"></div>
      <div className="fitzone-bg-shape fitzone-bg-right"></div>

      <section className="fitzone-login-layout">
        <aside className="fitzone-welcome-card">
          <a className="fitzone-login-brand" href="/">
            <span>F</span>
            <div>
              <strong>FITZONE</strong>
              <small>GYM & FITNESS</small>
            </div>
          </a>

          <div className="fitzone-welcome-copy">
            <h1>Welcome back, champion.</h1>
            <p>
              Sign in to manage your membership, book classes, track workouts,
              and continue your fitness journey with FitZone.
            </p>
          </div>

          <div className="fitzone-stat-grid">
            <div>
              <strong>24/7</strong>
              <span>Member Access</span>
            </div>
            <div>
              <strong>50+</strong>
              <span>Weekly Classes</span>
            </div>
            <div>
              <strong>4</strong>
              <span>Expert Trainers</span>
            </div>
          </div>

          <blockquote>“Small progress every day adds up to big results.”</blockquote>
        </aside>

        <section className="fitzone-auth-area">
          {!clerkEnabled && (
            <div className="fitzone-login-card fitzone-config-card">
              <div className="fitzone-login-heading">
                <h2>Connect Clerk</h2>
                <p>Add your Clerk publishable key to enable login.</p>
              </div>
              <code>VITE_CLERK_PUBLISHABLE_KEY=pk_test_...</code>
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
