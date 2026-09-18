const PRODUCTION_APP_URL = "https://rllora.online";

/**
 * Returns the URL users should be sent back to after completing a flow.
 *
 * This value is configuration, rather than derived from the request Host
 * header. Host is client-controlled when the API is reachable through a
 * proxy, and must not be used for payment provider redirects.
 */
export function publicAppUrl(): string {
  const configured = process.env.PUBLIC_APP_URL?.trim();
  const value = configured || PRODUCTION_APP_URL;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("PUBLIC_APP_URL must be a valid http(s) URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("PUBLIC_APP_URL must use http or https.");
  }

  // Keep the configured path, if any, but never retain trailing slashes.
  return value.replace(/\/+$/, "");
}
