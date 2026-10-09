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

// Letter pairs common in English text (learned from the site's own state
// law guides). Keyboard-mash usernames like "jfiavzobakqfuglzaslka" are
// mostly made of pairs outside this set; real names and word mashups
// ("jenninthevalley", "stephaniekowalczyk") stay well under the cutoff.
const COMMON_LETTER_PAIRS = new Set(
  "ab ac ad ai ak al am an ap ar as at av aw ax ay ba be bi bl bo br bu ca ce ch ci ck cl co cr ct da de di do dr ds du dv ea ec ed ee ef eg ei el em en ep er es et ev ew ex fd fe ff fi fl fo fr ga ge gh gi go gr gu ha hc he hi ho ia ib ic id ie if ig ii ij ik il im in io ir is it iv iz ja ju ka ke ki ks la ld le li ll lo ls lt lu ly ma mb me mi mo mp ms mu na nc nd ne nf ng ni nk nl nm nn no ns nt nv ny ob oc od of og oi ok ol om on oo op or os ot ou ov ow ox oy pa pe pl po pp pr ps pt pu qu ra rc rd re rg ri rk rm rn ro rr rs rt ru ry sa sc sd se sh si sm so sp ss st su sy ta te th ti to tr ts tu tw ty ua ub uc ud ug ui ul un up ur us ut uy va ve vi vo wa we wh wi wo ws xe xi ye yn yo yt ze".split(" ")
);
const GIBBERISH_MIN_LETTERS = 12;
const GIBBERISH_RARE_SHARE = 0.5;

export function looksLikeGibberish(text: string): boolean {
  const s = text.toLowerCase().replace(/[^a-z]/g, "");
  if (s.length < GIBBERISH_MIN_LETTERS) return false;
  let rare = 0;
  for (let i = 0; i < s.length - 1; i++) if (!COMMON_LETTER_PAIRS.has(s.slice(i, i + 2))) rare++;
  return rare / (s.length - 1) >= GIBBERISH_RARE_SHARE;
}
