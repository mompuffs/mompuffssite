// Shared bot-repellent checks for public forms (contact, registration).
// Neither check is visible to a human filling the form normally, so both
// can be treated as a reliable "this wasn't a person" signal.

// Real users can't submit before this much time has passed since the form
// rendered -- a script that posts straight to the API, or a bot that fills
// and submits a scraped form instantly, will.
export const MIN_SUBMIT_MS = 2000;

export function isHoneypotFilled(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function isSubmittedTooFast(formRenderedAt: unknown): boolean {
  const renderedAt = Number(formRenderedAt);
  if (!Number.isFinite(renderedAt)) {
    // Missing/malformed timestamp -- treat like a bot that skipped the field
    // entirely rather than trusting it.
    return true;
  }
  return Date.now() - renderedAt < MIN_SUBMIT_MS;
}

// True if either check flags the submission as automated. Callers should
// respond as if the submission succeeded (don't reveal that it was
// silently dropped) so a bot can't learn to route around this.
export function looksLikeBot(fields: { honeypot: unknown; formRenderedAt: unknown }): boolean {
  return isHoneypotFilled(fields.honeypot) || isSubmittedTooFast(fields.formRenderedAt);
}
