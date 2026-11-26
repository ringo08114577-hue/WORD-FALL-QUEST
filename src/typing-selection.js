/** Resolve one typed alphabet key against the currently displayed spelling choices. */
export function resolveTypedLetterSelection(state, rawLetter) {
  if (!state || state.phase !== "active" || !Array.isArray(state.letters)) {
    return { status: "inactive", letter: null };
  }

  const letter = typeof rawLetter === "string" ? rawLetter.trim().toUpperCase() : "";
  if (!/^[A-Z]$/.test(letter)) {
    return { status: "invalid-input", letter: null };
  }

  const matchingOptions = state.letters.filter((option) => option?.value === letter);
  if (matchingOptions.length === 0) {
    return { status: "not-choice", letter };
  }

  const availableOption = matchingOptions.find((option) => option.disabled !== true);
  if (!availableOption) {
    return { status: "disabled", letter };
  }

  return {
    status: "selected",
    letter,
    lane: availableOption.lane,
  };
}
