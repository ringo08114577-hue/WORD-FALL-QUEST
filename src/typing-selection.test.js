import test from "node:test";
import assert from "node:assert/strict";

import { resolveTypedLetterSelection } from "./typing-selection.js";

const activeState = {
  phase: "active",
  letters: [
    { value: "A", lane: 0 },
    { value: "P", lane: 1 },
    { value: "Z", lane: 2, disabled: true },
  ],
};

test("typed lower- or upper-case letters select the matching visible option", () => {
  assert.deepEqual(resolveTypedLetterSelection(activeState, "a"), {
    status: "selected",
    letter: "A",
    lane: 0,
  });
  assert.deepEqual(resolveTypedLetterSelection(activeState, "P"), {
    status: "selected",
    letter: "P",
    lane: 1,
  });
});

test("a valid alphabet key that is not displayed is reported as a typo, not a choice", () => {
  assert.deepEqual(resolveTypedLetterSelection(activeState, "Q"), {
    status: "not-choice",
    letter: "Q",
  });
});

test("a displayed but disabled choice is reported separately and cannot be selected", () => {
  assert.deepEqual(resolveTypedLetterSelection(activeState, "z"), {
    status: "disabled",
    letter: "Z",
  });
});

test("non-letter input and inactive spelling phases are ignored", () => {
  assert.deepEqual(resolveTypedLetterSelection(activeState, "5"), {
    status: "invalid-input",
    letter: null,
  });
  assert.deepEqual(resolveTypedLetterSelection({ ...activeState, phase: "word-complete" }, "A"), {
    status: "inactive",
    letter: null,
  });
});
