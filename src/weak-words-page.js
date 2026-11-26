import { createAppSession } from "./app-session.js";
import { WORD_CHALLENGES } from "./data/words.js";
import { sortWeakWordEntries } from "./weak-words.js";

const session = createAppSession();
const $ = (id) => document.getElementById(id);
const list = $("weakWordList");
const empty = $("weakWordEmpty");
const feedback = $("weakWordFeedback");
const definitions = new Map(WORD_CHALLENGES.map((challenge) => [challenge.id, challenge]));

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function render() {
  const entries = sortWeakWordEntries(session.getWeakWords())
    .filter((entry) => definitions.has(entry.wordId));
  const totalMistakes = entries.reduce((total, entry) => total + entry.mistakes, 0);
  $("weakWordCount").textContent = entries.length + "語";
  $("weakMistakeTotal").textContent = "累計ミス " + totalMistakes + "回";
  list.replaceChildren();
  empty.hidden = entries.length > 0;

  for (const entry of entries) {
    const challenge = definitions.get(entry.wordId);
    const card = makeElement("article", "weak-card");
    card.dataset.wordId = entry.wordId;

    const main = makeElement("div", "weak-card-main");
    const meta = makeElement("div", "weak-meta");
    meta.append(
      makeElement("span", "weak-tag", "難易度 Lv." + challenge.difficulty),
      makeElement("span", "weak-tag weak-tag--miss", "ミス " + entry.mistakes + "回"),
    );
    const japanese = makeElement("strong", "weak-japanese", challenge.japanese);
    japanese.lang = "ja";

    const answer = makeElement("div", "weak-answer");
    answer.hidden = true;
    answer.append(
      makeElement("strong", "weak-english", challenge.word),
      makeElement("span", "weak-part", challenge.partOfSpeech ?? "英単語"),
    );
    main.append(meta, japanese, answer);

    const actions = makeElement("div", "weak-actions");
    const revealButton = makeElement("button", "primary", "答えを見る");
    revealButton.type = "button";
    revealButton.dataset.action = "reveal";
    const masteredButton = makeElement("button", "mastered", "覚えた！");
    masteredButton.type = "button";
    masteredButton.dataset.action = "mastered";
    masteredButton.hidden = true;
    actions.append(revealButton, masteredButton);
    card.append(main, actions);
    list.append(card);
  }
}

list.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const card = button.closest(".weak-card");
  const wordId = card?.dataset.wordId;
  if (!wordId) return;

  if (button.dataset.action === "reveal") {
    const answer = card.querySelector(".weak-answer");
    answer.hidden = false;
    button.hidden = true;
    card.querySelector('button[data-action="mastered"]').hidden = false;
    feedback.textContent = "答えを確認して、覚えたら「覚えた！」を押そう。";
    return;
  }

  if (button.dataset.action === "mastered") {
    const result = session.markWeakWordMastered(wordId);
    if (!result.removed) return;
    feedback.textContent = result.saved
      ? "単語を苦手単語帳から卒業させたよ！"
      : "単語を表示から外したよ。保存できなかったため、ページを閉じる前に再確認してね。";
    render();
  }
});

render();
window.addEventListener("pagehide", () => session.save());
