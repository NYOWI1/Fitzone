export const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export const clerkProviderProps = {
  afterSignOutUrl: "/",
  publishableKey: clerkPublishableKey,
  signInFallbackRedirectUrl: "/dashboard",
  signInForceRedirectUrl: "/dashboard",
  signInUrl: "/login",
  signUpFallbackRedirectUrl: "/choose-plan",
  signUpForceRedirectUrl: "/choose-plan",
  signUpUrl: "/signup",
};

export const isClerkEnabled = Boolean(clerkPublishableKey);
