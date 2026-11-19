import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type SiteverifyResponse = {
  success?: unknown;
  action?: unknown;
  hostname?: unknown;
  "error-codes"?: unknown;
};

export async function verifyTurnstileToken(
  token: string,
  expectedAction: string
): Promise<boolean> {
  if (!token || token.length > 2048) {
    console.error("Turnstile token is missing or invalid");
    return false;
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY is not configured");
    return false;
  }

  const expectedHostnames = new Set(
    (process.env.TURNSTILE_HOSTNAMES ?? "")
      .split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean)
  );
  if (expectedHostnames.size === 0) {
    console.error("TURNSTILE_HOSTNAMES is not configured");
    return false;
  }

  let response: Response;
  try {
    response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    console.error("Turnstile verification request failed");
    return false;
  }

  if (!response.ok) {
    console.error("Turnstile verification returned HTTP error", response.status);
    return false;
  }

  let data: SiteverifyResponse;
  try {
    const payload: unknown = await response.json();
    if (
      typeof payload !== "object" ||
      payload === null ||
      Array.isArray(payload)
    ) {
      console.error("Turnstile verification returned an invalid response");
      return false;
    }
    data = payload;
  } catch {
    console.error("Turnstile verification response could not be parsed");
    return false;
  }

  if (data.success === true) {
    if (data.action !== expectedAction) {
      console.error("Turnstile token action did not match the form");
      return false;
    }

    if (
      typeof data.hostname !== "string" ||
      !expectedHostnames.has(data.hostname.toLowerCase())
    ) {
      console.error("Turnstile token hostname is not approved");
      return false;
    }

    return true;
  }

  const errorCodes = Array.isArray(data["error-codes"])
    ? data["error-codes"].filter(
        (code): code is string =>
          typeof code === "string" && /^[a-z0-9-]+$/.test(code)
      )
    : [];
  console.error("Turnstile token rejected", errorCodes);
  return false;
}
