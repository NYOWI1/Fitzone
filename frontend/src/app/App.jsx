import { useEffect } from "react";
import Home from "../features/home";
import AdminPanel, { AdminLoginPage } from "../features/admin-panel";
import { LoginPage, SignUpPage } from "../features/auth";
import UserDashboard from "../features/user-dashboard";
import { ChoosePlanPage, PaymentPage } from "../features/membership-flow";
import { TrainerDetailRoute } from "../features/trainer-detail/TrainerDetail";
import { appRoutes, isAdminRoute } from "./routes";

function RedirectToChoosePlan() {
  useEffect(() => {
    window.location.replace(
      `${appRoutes.choosePlan}${window.location.search}${window.location.hash}`,
    );
  }, []);
  return null;
}

function App({ clerkEnabled }) {
  const pathname = window.location.pathname;
  const authRedirect = new URLSearchParams(window.location.search).get(
    "redirect_url",
  );

  if (pathname.startsWith(appRoutes.adminLogin)) {
    return <AdminLoginPage clerkEnabled={clerkEnabled} />;
  }

  if (
    pathname.startsWith(appRoutes.login) &&
    (authRedirect === appRoutes.admin ||
      authRedirect?.startsWith(`${appRoutes.admin}/`))
  ) {
    return <AdminLoginPage clerkEnabled={clerkEnabled} />;
  }

  if (pathname.startsWith(appRoutes.login)) {
    return <LoginPage clerkEnabled={clerkEnabled} />;
  }

  if (pathname.startsWith(appRoutes.signup)) {
    return <SignUpPage clerkEnabled={clerkEnabled} />;
  }

  if (pathname === "/choose-plans" || pathname === "/choose-plans/" || pathname === `${appRoutes.choosePlan}/`) {
    return <RedirectToChoosePlan />;
  }

  if (pathname === appRoutes.choosePlan) {
    return <ChoosePlanPage clerkEnabled={clerkEnabled} />;
  }

  if (pathname.startsWith(appRoutes.payment)) {
    return <PaymentPage clerkEnabled={clerkEnabled} />;
  }

  if (pathname.startsWith(appRoutes.dashboard)) {
    return <UserDashboard clerkEnabled={clerkEnabled} />;
  }

  if (pathname.startsWith(`${appRoutes.trainers}/`)) {
    const trainerSlug = decodeURIComponent(
      pathname.split("/").filter(Boolean)[1] || "",
    );

    return <TrainerDetailRoute trainerSlug={trainerSlug} />;
  }

  if (isAdminRoute(pathname, window.location.hash)) {
    return <AdminPanel clerkEnabled={clerkEnabled} />;
  }

  return <Home clerkEnabled={clerkEnabled} />;
}

export default App;
