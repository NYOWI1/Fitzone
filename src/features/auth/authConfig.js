export const AUTH_REDIRECT_AFTER_LOGIN = "/dashboard";
export const AUTH_REDIRECT_AFTER_SIGNUP = "/choose-plan";

export function getAuthErrorMessage(
  error,
  fallbackMessage = "Authentication failed. Please try again.",
) {
  return (
    error?.errors?.[0]?.longMessage ||
    error?.errors?.[0]?.message ||
    error?.message ||
    fallbackMessage
  );
}
