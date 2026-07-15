export const appRoutes = {
  admin: "/admin",
  choosePlan: "/choose-plan",
  dashboard: "/dashboard",
  login: "/login",
  payment: "/payment",
  signup: "/signup",
};

export function isAdminRoute(pathname, hash) {
  return pathname.startsWith(appRoutes.admin) || hash === "#admin";
}
