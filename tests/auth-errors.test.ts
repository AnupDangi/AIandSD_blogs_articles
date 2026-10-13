import { describe, expect, it } from "vitest";
import { callbackErrorMessage, callbackFailureCode, describeSignInFailure, providerErrorCode } from "../src/lib/auth-errors";

describe("describeSignInFailure", () => {
  it("tells learners about email rate limits instead of a generic outage", () => {
    const failure = describeSignInFailure({ code: "over_email_send_rate_limit", status: 429, message: "email rate limit exceeded" }, "email");
    expect(failure).toMatchObject({ status: 429, error: "rate_limited" });
    expect(failure.message).toMatch(/wait a few minutes/i);
    expect(failure.message).toMatch(/Google or GitHub/);
  });
  it("maps disabled methods, bad addresses and delivery failures", () => {
    expect(describeSignInFailure({ code: "email_provider_disabled" }, "email").error).toBe("method_disabled");
    expect(describeSignInFailure({ code: "signup_disabled" }, "email").error).toBe("method_disabled");
    expect(describeSignInFailure({ code: "email_address_invalid" }, "email")).toMatchObject({ status: 400, error: "invalid_email" });
    expect(describeSignInFailure({ status: 500, message: "Error sending magic link email" }, "email").error).toBe("email_delivery_failed");
  });
  it("never echoes raw provider messages", () => {
    const failure = describeSignInFailure({ message: "smtp password for relay.internal is wrong", status: 500 }, "email");
    expect(JSON.stringify(failure)).not.toMatch(/relay\.internal|password/);
    expect(describeSignInFailure(null, "oauth")).toMatchObject({ status: 503, error: "sign_in_unavailable" });
  });
});

describe("callback errors", () => {
  it("separates a link opened in another browser from an expired link", () => {
    expect(callbackFailureCode({ code: "bad_code_verifier" })).toBe("wrong_browser");
    expect(callbackFailureCode({ message: "PKCE code verifier not found in storage" })).toBe("wrong_browser");
    expect(callbackFailureCode({ code: "flow_state_expired" })).toBe("expired_link");
    expect(callbackFailureCode({ status: 429 })).toBe("rate_limited");
    expect(callbackFailureCode({ code: "unexpected_failure" })).toBe("callback_failed");
  });
  it("reads provider error redirects", () => {
    expect(providerErrorCode(new URLSearchParams("error=access_denied&error_description=User+denied"))).toBe("access_denied");
    expect(providerErrorCode(new URLSearchParams("error=access_denied&error_code=otp_expired"))).toBe("expired_link");
    expect(providerErrorCode(new URLSearchParams("error=server_error"))).toBe("callback_failed");
    expect(providerErrorCode(new URLSearchParams("code=abc"))).toBeNull();
  });
  it("has a distinct message for every code the callback can emit", () => {
    const codes = ["setup_required", "access_denied", "wrong_browser", "expired_link", "missing_code", "callback_failed", "rate_limited", "cross_origin_request"];
    const messages = new Set(codes.map(callbackErrorMessage));
    expect(messages.size).toBe(codes.length - 1); // missing_code shares callback_failed
    expect(callbackErrorMessage("whatever")).toMatch(/temporarily unavailable/);
  });
});
