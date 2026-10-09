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

// Throwaway-inbox services. Spam sign-ups lean on these; real members don't.
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "sharklasers.com",
  "grr.la", "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org", "temp-mail.io",
  "tempmail.net", "tempmailo.com", "tempail.com", "yopmail.com", "yopmail.net", "trashmail.com",
  "trashmail.de", "getnada.com", "nada.email", "dispostable.com", "maildrop.cc", "mailnesia.com",
  "throwawaymail.com", "fakeinbox.com", "mohmal.com", "emailondeck.com", "mintemail.com",
  "spamgourmet.com", "burnermail.io", "moakt.com", "tmail.ws", "mailpoof.com", "discard.email",
  "inboxkitten.com", "emailfake.com", "fakemail.net", "mail.tm", "mailto.plus", "tmpmail.org",
  "tmpmail.net", "dropmail.me", "spambox.us", "mytemp.email", "minuteinbox.com", "byom.de",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  return Boolean(domain && DISPOSABLE_EMAIL_DOMAINS.has(domain));
}

// Spam accounts stuff links or domains into the name fields so they show up
// wherever the name does.
export function containsLink(text: string): boolean {
  return /https?:\/\/|www\.|\.(com|net|org|ru|xyz|top|info|biz|io|shop|site|online)\b/i.test(text);
}
