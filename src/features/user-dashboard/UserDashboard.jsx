import { useEffect, useState } from "react";
import { SignedIn, SignedOut, useUser } from "@clerk/clerk-react";
import { getStripePaymentAccess } from "../../shared/api";
import "./UserDashboard.css";

const navItems = ["Dashboard", "Classes", "My Plan", "Trainers", "Progress", "Payments", "Settings"];

function DashboardContent({ user = null }) {
  const fullName = user?.fullName || "Member";

  return (
    <main className="member-dashboard member-placeholder-page">
      <div className="member-bg member-bg-red"></div>
      <div className="member-bg member-bg-green"></div>

      <aside className="member-sidebar">
        <a className="member-brand" href="/">
          <span>F</span>
          <div>
            <strong>FITZONE</strong>
            <small>MEMBER APP</small>
          </div>
        </a>

        <nav className="member-nav" aria-label="Member dashboard">
          {navItems.map((item) => (
            <a className={item === "Dashboard" ? "active" : ""} href="#dashboard" key={item}>
              <span></span>
              {item}
            </a>
          ))}
        </nav>

        <div className="member-profile-card">
          <span>{fullName.charAt(0).toUpperCase()}</span>
          <div>
            <strong>{fullName}</strong>
            <small>Member</small>
          </div>
        </div>
      </aside>

      <section className="member-main">
        <section className="member-placeholder-card">
          <h1>User Dashboard</h1>
          <p>This member section is ready for its live controls and will keep the same responsive layout as the rest of the panel.</p>
        </section>
      </section>
    </main>
  );
}

function AuthenticatedDashboard() {
  const { user } = useUser();
  const [accessStatus, setAccessStatus] = useState("loading");
  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress;
  const memberName = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ");

  useEffect(() => {
    let isCurrent = true;

    async function verifyPaymentAccess() {
      if (!email) {
        setAccessStatus("unpaid");
        return;
      }

      try {
        setAccessStatus("loading");
        const access = await getStripePaymentAccess(email, memberName);

        if (isCurrent) {
          setAccessStatus(access.paid ? "paid" : "unpaid");
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setAccessStatus("error");
        }
      }
    }

    verifyPaymentAccess();

    return () => {
      isCurrent = false;
    };
  }, [email, memberName]);

  if (accessStatus === "loading") {
    return <DashboardState title="Checking payment" message="Verifying your Stripe membership payment..." />;
  }

  if (accessStatus === "error") {
    return <DashboardState title="Payment check unavailable" message="Stripe payment verification is unavailable right now." />;
  }

  if (accessStatus !== "paid") {
    return <PaymentRequired />;
  }

  return <DashboardContent user={user} />;
}

function DashboardState({ title, message }) {
  return (
    <main className="member-dashboard member-auth-redirect">
      <section>
        <h1>{title}</h1>
        <p>{message}</p>
      </section>
    </main>
  );
}

function PaymentRequired() {
  return (
    <main className="member-dashboard member-auth-redirect">
      <section>
        <h1>Payment required</h1>
        <p>Complete your membership payment before opening the member dashboard.</p>
        <a href="/choose-plan">Choose a plan</a>
      </section>
    </main>
  );
}

function UserDashboard({ clerkEnabled }) {
  return (
    <>
      {clerkEnabled ? (
        <>
          <SignedIn>
            <AuthenticatedDashboard />
          </SignedIn>
          <SignedOut>
            <main className="member-dashboard member-auth-redirect">
              <section>
                <h1>Login required</h1>
                <p>Sign in to view your FitZone dashboard.</p>
                <a href="/login">Go to login</a>
              </section>
            </main>
          </SignedOut>
        </>
      ) : (
        <main className="member-dashboard member-auth-redirect">
          <section>
            <h1>Connect Clerk</h1>
            <p>Clerk is required to match members to Stripe payments.</p>
            <a href="/login">Back to login</a>
          </section>
        </main>
      )}
    </>
  );
}

export default UserDashboard;
