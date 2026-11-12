import { createAppSession } from "./app-session.js";
import { GAME_ACTION, ACTION_LOG_CATEGORY } from "./game-state.js";

const session = createAppSession();
const { store, saves } = session;
const $ = (id) => document.getElementById(id);

const categoryLabels = {
  [ACTION_LOG_CATEGORY.BATTLE]: "バトル",
  [ACTION_LOG_CATEGORY.COMBAT]: "戦闘",
  [ACTION_LOG_CATEGORY.SKILL]: "スキル",
  [ACTION_LOG_CATEGORY.ITEM]: "アイテム",
  [ACTION_LOG_CATEGORY.EQUIPMENT]: "装備",
  [ACTION_LOG_CATEGORY.REWARD]: "報酬",
  [ACTION_LOG_CATEGORY.PROGRESS]: "進行",
  [ACTION_LOG_CATEGORY.SYSTEM]: "システム",
};

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "日時不明";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function render() {
  const entries = store.getState().actionLog.slice().reverse();
  const root = $("logList");
  root.replaceChildren();
  $("logCount").textContent = entries.length + "件";
  $("clearButton").disabled = entries.length === 0;

  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "まだ行動ログはないよ。\n冒険を始めると、ここに記録が残るよ。";
    root.append(empty);
    return;
  }

  for (const entry of entries) {
    const article = document.createElement("article");
    article.className = "log-entry";
    const main = document.createElement("div");
    main.className = "log-main";

    const category = document.createElement("span");
    category.className = "category";
    category.dataset.category = entry.category;
    category.textContent = categoryLabels[entry.category] ?? "記録";

    const message = document.createElement("p");
    message.className = "message";
    message.textContent = entry.message;
    main.append(category, message);

    const time = document.createElement("time");
    time.dateTime = new Date(entry.timestamp).toISOString();
    time.textContent = formatTimestamp(entry.timestamp);
    article.append(main, time);
    root.append(article);
  }
}

$("clearButton").addEventListener("click", () => {
  if (!window.confirm("行動ログをすべて消去する？この操作は元に戻せないよ。")) return;
  store.dispatch({ type: GAME_ACTION.CLEAR_ACTION_LOG });
  const result = saves.save();
  $("feedback").textContent = result.saved
    ? "行動ログを消去して保存したよ。"
    : "消去したけれど、保存には失敗したよ。";
  render();
});

store.subscribe(render);
render();
if (session.initialLoad.loaded) $("feedback").textContent = "保存された冒険ログを読み込んだよ。";
else if (session.initialLoad.reason === "invalid-save") $("feedback").textContent = "保存データを読み込めなかったよ。";
window.addEventListener("pagehide", () => saves.save());
