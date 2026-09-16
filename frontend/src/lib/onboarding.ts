const ONBOARDED_KEY = "synchrone_recall_onboarded";
const USER_KEY = "synchrone_recall_user";

export type OnboardingUser = { name: string; email: string };

export function hasOnboarded(): boolean {
  try {
    // ?admin=1 is the fast path for internal/admin use — skips the
    // cosmetic signup + tutorial entirely, as requested.
    if (new URLSearchParams(window.location.search).get("admin") === "1") return true;
    return localStorage.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return true; // never let storage errors block access to the app
  }
}

export function completeOnboarding(user: OnboardingUser | null) {
  try {
    localStorage.setItem(ONBOARDED_KEY, "1");
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* private browsing / storage disabled — fine, just won't persist */
  }
}

export function getOnboardingUser(): OnboardingUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
