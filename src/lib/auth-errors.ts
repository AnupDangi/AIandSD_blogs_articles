/** Maps provider failures to a stable code, HTTP status and a message that tells the learner what to do. */
export type SignInFailure = { status: number; error: string; message: string };

type AuthLikeError = { code?: string; status?: number; message?: string } | null | undefined;

const OTHER_METHODS = "Try Google or GitHub instead, or continue as a guest.";

export function describeSignInFailure(error: AuthLikeError, method: "email" | "oauth"): SignInFailure {
  const code = error?.code ?? "";
  const status = error?.status ?? 0;
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || status === 429) {
    return { status: 429, error: "rate_limited", message: `Too many sign-in attempts. Wait a few minutes before requesting another email. ${method === "email" ? OTHER_METHODS : ""}`.trim() };
  }
  if (code === "email_address_invalid" || code === "validation_failed") {
    return { status: 400, error: "invalid_email", message: "That email address was not accepted. Check it and try again." };
  }
  if (code === "email_address_not_authorized") {
    return { status: 403, error: "email_not_authorized", message: `Emails cannot be sent to that address yet. ${OTHER_METHODS}` };
  }
  if (["signup_disabled", "email_provider_disabled", "otp_disabled", "provider_disabled", "oauth_provider_not_supported"].includes(code)) {
    return { status: 503, error: "method_disabled", message: `That sign-in method is turned off on this deployment. ${OTHER_METHODS}` };
  }
  if (method === "email" && (status >= 500 || /sending|smtp|mail/i.test(error?.message ?? ""))) {
    return { status: 503, error: "email_delivery_failed", message: `The sign-in email could not be sent right now. ${OTHER_METHODS}` };
  }
  return { status: 503, error: "sign_in_unavailable", message: "Sign-in is temporarily unavailable. Please try again, or continue as a guest." };
}

/** Error codes the callback puts in `?error=`. */
export function callbackErrorMessage(error: string | undefined): string {
  switch (error) {
    case "setup_required": return "Sign-in is not configured on this deployment yet. You can continue learning as a guest.";
    case "access_denied": return "Sign-in was cancelled or the provider did not allow access. You can try again or use another method.";
    case "wrong_browser": return "Open the email link in the same browser where you asked for it. Request a new link here if you switched browsers or devices.";
    case "expired_link": return "That sign-in link has expired or was already used. Request a fresh one.";
    case "missing_code":
    case "callback_failed": return "That sign-in could not be completed. Request a fresh link or try Google or GitHub again.";
    case "rate_limited": return "Too many sign-in attempts. Wait a few minutes and try again.";
    case "cross_origin_request": return "Sign-in only works from the address this app is configured for.";
    default: return "Sign-in is temporarily unavailable. Please try again, or continue as a guest.";
  }
}

/** Classifies a failure from exchanging the code that came back on the callback URL. */
export function callbackFailureCode(error: AuthLikeError): string {
  const code = error?.code ?? "";
  if (code === "bad_code_verifier" || /code verifier|pkce/i.test(error?.message ?? "")) return "wrong_browser";
  if (code === "flow_state_expired" || code === "flow_state_not_found" || code === "otp_expired") return "expired_link";
  if (code === "over_request_rate_limit" || error?.status === 429) return "rate_limited";
  return "callback_failed";
}

/** Providers send `error=access_denied` (and similar) to the callback instead of a code. */
export function providerErrorCode(searchParams: URLSearchParams): string | null {
  const error = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  if (!error && !errorCode) return null;
  if (error === "access_denied" && (errorCode === "otp_expired" || /expired/i.test(searchParams.get("error_description") ?? ""))) return "expired_link";
  if (error === "access_denied") return "access_denied";
  return "callback_failed";
}
