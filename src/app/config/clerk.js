export const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export const clerkProviderProps = {
  afterSignOutUrl: "/",
  publishableKey: clerkPublishableKey,
  signInFallbackRedirectUrl: "/dashboard",
  signInUrl: "/login",
  signUpFallbackRedirectUrl: "/choose-plan",
  signUpUrl: "/signup",
};

export const isClerkEnabled = Boolean(clerkPublishableKey);
