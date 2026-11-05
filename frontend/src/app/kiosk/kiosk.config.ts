/** Kiosk settings. See docs/kiosk.md. */

/** The branch this kiosk stands in. Only the Head Office has a kiosk for now. */
export const KIOSK_BRANCH_CODE = 201;

/** After this long without a touch, show the "Are you still there?" countdown. */
export const IDLE_WARNING_MS = 80_000;

/** ...and after this long, wipe everything and go back to the welcome screen. */
export const IDLE_RESET_MS = 90_000;

/** How long the "Thank you" screen stays up after a call-back request. */
export const THANK_YOU_MS = 8_000;
