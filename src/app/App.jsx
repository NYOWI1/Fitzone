import Home from "../features/home";
import AdminPanel from "../features/admin-panel";
import { LoginPage, SignUpPage } from "../features/auth";
import UserDashboard from "../features/user-dashboard";
import { ChoosePlanPage, PaymentPage } from "../features/membership-flow";
import { appRoutes, isAdminRoute } from "./routes";

function App({ clerkEnabled }) {
  const pathname = window.location.pathname;

  if (pathname.startsWith(appRoutes.login)) {
    return <LoginPage clerkEnabled={clerkEnabled} />;
  }

  if (pathname.startsWith(appRoutes.signup)) {
    return <SignUpPage clerkEnabled={clerkEnabled} />;
  }

  if (pathname.startsWith(appRoutes.choosePlan)) {
    return <ChoosePlanPage />;
  }

  if (pathname.startsWith(appRoutes.payment)) {
    return <PaymentPage clerkEnabled={clerkEnabled} />;
  }

  if (pathname.startsWith(appRoutes.dashboard)) {
    return <UserDashboard clerkEnabled={clerkEnabled} />;
  }

  if (isAdminRoute(pathname, window.location.hash)) {
    return <AdminPanel />;
  }

  return <Home clerkEnabled={clerkEnabled} />;
}

export default App;
