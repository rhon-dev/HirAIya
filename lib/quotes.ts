const QUOTES_BY_MOOD: Record<number, string[]> = {
  1: [
    "This feeling is real, and it will pass.",
    "You don't have to have it all figured out today.",
    "Rest is not giving up — it's making room to keep going.",
    "It's okay to not be okay for a while.",
    "Small steps still count as moving forward.",
    "You've gotten through every hard day so far.",
  ],
  2: [
    "Some days ask more of us than others.",
    "Naming a feeling is the first step to easing it.",
    "You're allowed to take today slower than usual.",
    "It's okay to lean on someone right now.",
    "Tomorrow gets to be different from today.",
    "Not every day has to be a good one to be worth living.",
  ],
  3: [
    "An even day is still a day you showed up for.",
    "Neutral is a fine place to rest before the next thing.",
    "Not everything has to be exciting to be enough.",
    "Steady counts, even when it doesn't feel remarkable.",
    "You don't owe today a bigger feeling than it has.",
    "Calm is its own kind of progress.",
  ],
  4: [
    "Let yourself enjoy this without waiting for a catch.",
    "Good days are worth noticing, not just good news days.",
    "This feeling is evidence, not luck.",
    "You're allowed to feel proud of an ordinary good day.",
    "Hold onto this one — it's yours.",
    "A good day doesn't need a big reason.",
  ],
  5: [
    "Let this one really land.",
    "You deserve days that feel this good.",
    "Savor it — you don't need permission to feel great.",
    "This is worth remembering on harder days.",
    "Joy like this is worth naming out loud.",
    "Bank this feeling for later.",
  ],
};

// Deterministic pick so the same entry always shows the same quote
// (stable across refreshes/re-renders instead of re-rolling randomly).
export function getQuoteForEntry(entryId: string, mood: number): string {
  const quotes = QUOTES_BY_MOOD[mood] ?? QUOTES_BY_MOOD[3];
  let hash = 0;
  for (let i = 0; i < entryId.length; i++) {
    hash = (hash * 31 + entryId.charCodeAt(i)) % quotes.length;
  }
  return quotes[Math.abs(hash) % quotes.length];
}
