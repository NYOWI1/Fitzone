import { useState } from "react";
import { SignedIn, SignedOut, useSignUp } from "@clerk/clerk-react";
import "./SignUpPage.css";
import RedirectSignedInUser from "../../components/RedirectSignedInUser";
import { AUTH_REDIRECT_AFTER_SIGNUP, getAuthErrorMessage } from "../../authConfig";

function SignUpForm({ clerkEnabled }) {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [formValues, setFormValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [formMode, setFormMode] = useState("details");
  const [formStatus, setFormStatus] = useState("idle");
  const [formMessage, setFormMessage] = useState("");

  const isBusy = formStatus === "submitting";

  const updateFormValue = (field, value) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const createAccount = async (event) => {
    event.preventDefault();

    if (!clerkEnabled) {
      setFormMessage("Add VITE_CLERK_PUBLISHABLE_KEY to .env and restart the dev server.");
      return;
    }

    if (!isLoaded) {
      return;
    }

    if (formValues.password !== formValues.confirmPassword) {
      setFormMessage("Passwords do not match.");
      return;
    }

    if (!acceptedTerms) {
      setFormMessage("Please agree to the FitZone terms and privacy policy.");
      return;
    }

    try {
      setFormStatus("submitting");
      setFormMessage("");

      const signUpAttempt = await signUp.create({
        emailAddress: formValues.email,
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        password: formValues.password,
        unsafeMetadata: {
          phoneNumber: formValues.phoneNumber,
        },
      });

      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });
        window.location.href = AUTH_REDIRECT_AFTER_SIGNUP;
        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setFormMode("verify");
      setFormMessage("Enter the verification code Clerk sent to your email.");
    } catch (error) {
      console.error(error);
      setFormMessage(getAuthErrorMessage(error));
    } finally {
      setFormStatus("idle");
    }
  };

  const verifyEmail = async (event) => {
    event.preventDefault();

    if (!isLoaded) {
      return;
    }

    try {
      setFormStatus("submitting");
      setFormMessage("");

      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        window.location.href = AUTH_REDIRECT_AFTER_SIGNUP;
        return;
      }

      setFormMessage("Verification is not complete yet. Check the code and try again.");
    } catch (error) {
      console.error(error);
      setFormMessage(getAuthErrorMessage(error));
    } finally {
      setFormStatus("idle");
    }
  };

  if (formMode === "verify") {
    return (
      <form className="fitzone-signup-form-card" onSubmit={verifyEmail}>
        <div className="fitzone-signup-heading">
          <h2>Verify your email</h2>
          <p>Enter the code sent to {formValues.email} to finish creating your account.</p>
        </div>

        <label className="fitzone-signup-field">
          <span>Verification Code</span>
          <input
            autoComplete="one-time-code"
            disabled={isBusy}
            onChange={(event) => setVerificationCode(event.target.value)}
            placeholder="Enter code"
            required
            value={verificationCode}
          />
        </label>

        {formMessage && <p className="fitzone-signup-message">{formMessage}</p>}

        <button className="fitzone-signup-submit" disabled={isBusy} type="submit">
          {isBusy ? "Verifying..." : "Verify Account"}
        </button>

        <button
          className="fitzone-signup-secondary"
          disabled={isBusy}
          onClick={() => setFormMode("details")}
          type="button"
        >
          Back to details
        </button>
      </form>
    );
  }

  return (
    <form className="fitzone-signup-form-card" onSubmit={createAccount}>
      <div className="fitzone-signup-heading">
        <h2>Create your account</h2>
        <p>First create your account. Then choose the membership plan that fits you best.</p>
      </div>

      <div className="fitzone-signup-grid">
        <label className="fitzone-signup-field">
          <span>First Name</span>
          <input
            autoComplete="given-name"
            disabled={isBusy}
            onChange={(event) => updateFormValue("firstName", event.target.value)}
            required
            value={formValues.firstName}
          />
        </label>

        <label className="fitzone-signup-field">
          <span>Last Name</span>
          <input
            autoComplete="family-name"
            disabled={isBusy}
            onChange={(event) => updateFormValue("lastName", event.target.value)}
            required
            value={formValues.lastName}
          />
        </label>
      </div>

      <label className="fitzone-signup-field">
        <span>Email</span>
        <input
          autoComplete="email"
          disabled={isBusy}
          onChange={(event) => updateFormValue("email", event.target.value)}
          placeholder="yourname@email.com"
          required
          type="email"
          value={formValues.email}
        />
      </label>

      <label className="fitzone-signup-field">
        <span>Phone Number</span>
        <input
          autoComplete="tel"
          disabled={isBusy}
          onChange={(event) => updateFormValue("phoneNumber", event.target.value)}
          placeholder="+66 00 000 0000"
          required
          type="tel"
          value={formValues.phoneNumber}
        />
      </label>

      <div className="fitzone-signup-grid">
        <label className="fitzone-signup-field">
          <span>Password</span>
          <input
            autoComplete="new-password"
            disabled={isBusy}
            onChange={(event) => updateFormValue("password", event.target.value)}
            placeholder="••••••••"
            required
            type="password"
            value={formValues.password}
          />
        </label>

        <label className="fitzone-signup-field">
          <span>Confirm Password</span>
          <input
            autoComplete="new-password"
            disabled={isBusy}
            onChange={(event) => updateFormValue("confirmPassword", event.target.value)}
            placeholder="••••••••"
            required
            type="password"
            value={formValues.confirmPassword}
          />
        </label>
      </div>

      <label className="fitzone-signup-terms">
        <input
          checked={acceptedTerms}
          disabled={isBusy}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
          type="checkbox"
        />
        <span>I agree to FitZone terms and privacy policy</span>
      </label>

      {formMessage && <p className="fitzone-signup-message">{formMessage}</p>}

      <button className="fitzone-signup-submit" disabled={isBusy} type="submit">
        {isBusy ? "Creating account..." : "Create Account"}
      </button>
    </form>
  );
}

function SignUpPage({ clerkEnabled }) {
  return (
    <main className="fitzone-signup-page">
      <div className="fitzone-signup-bg fitzone-signup-bg-left"></div>
      <div className="fitzone-signup-bg fitzone-signup-bg-right"></div>
      <div className="fitzone-signup-bg fitzone-signup-bg-gold"></div>

      <header className="fitzone-signup-nav">
        <a className="fitzone-signup-brand" href="/">
          <span>F</span>
          <strong>FITZONE</strong>
        </a>
        <div>
          <span>Already a member?</span>
          <a href="/login">Login</a>
        </div>
      </header>

      <section className="fitzone-signup-layout">
        <aside className="fitzone-signup-info-card">
          <span>Start your fitness journey</span>
          <h1>Join FitZone and train smarter.</h1>
          <p>Create your account to book classes, choose membership plans, and track your progress from one place.</p>

          <div className="fitzone-signup-benefits">
            <div>
              <span>✓</span>
              <div>
                <strong>Choose your plan</strong>
                <p>Basic, Standard, or Premium membership options.</p>
              </div>
            </div>
            <div>
              <span>✓</span>
              <div>
                <strong>Book classes faster</strong>
                <p>Reserve HIIT, yoga, strength, and cycling classes.</p>
              </div>
            </div>
            <div>
              <span>✓</span>
              <div>
                <strong>Track progress</strong>
                <p>Follow your workout journey and goals.</p>
              </div>
            </div>
          </div>

          <blockquote>No pressure. Start simple, improve every week.</blockquote>
        </aside>

        <section className="fitzone-signup-auth">
          {!clerkEnabled && (
            <div className="fitzone-signup-form-card fitzone-signup-config-card">
              <div className="fitzone-signup-heading">
                <h2>Connect Clerk</h2>
                <p>Add your Clerk publishable key to enable sign up.</p>
              </div>
              <code>VITE_CLERK_PUBLISHABLE_KEY=pk_test_...</code>
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
