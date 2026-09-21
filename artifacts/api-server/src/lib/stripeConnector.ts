import { ReplitConnectors } from "@replit/connectors-sdk";

export class StripeConnectorError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: unknown,
  ) {
    super(message);
  }
}

export async function stripeConnectorRequest<T = Record<string, unknown>>(
  path: string,
  options: { method?: string; form?: Record<string, string> } = {},
): Promise<T> {
  const connectors = new ReplitConnectors();
  const response = await connectors.proxy("stripe", path, {
    method: options.method || "GET",
    ...(options.form
      ? {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(options.form).toString(),
        }
      : {}),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = typeof (body as any)?.error?.message === "string"
      ? (body as any).error.message
      : `Stripe request failed with status ${response.status}`;
    throw new StripeConnectorError(providerMessage, response.status, body);
  }
  return body as T;
}