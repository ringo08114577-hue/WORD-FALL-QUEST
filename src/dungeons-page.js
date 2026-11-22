import { createAppSession } from "./app-session.js";
import { DUNGEON_DEFINITIONS } from "./data/dungeons.js";
import { GAME_PHASE } from "./game-state.js";

const $ = (id) => document.getElementById(id);
const session = createAppSession();
session.returnToTown();
const { store, dungeon, saves } = session;
let selectedFloor = dungeon.getProgress().floor;

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function saveAndRender(message) {
  const result = saves.save();
  $("feedback").textContent = message + (result.saved ? " 自動保存したよ。" : " 保存に失敗したよ。");
  render();
}
function renderDungeons() {
  const root = $("dungeonGrid");
  root.replaceChildren();
  const allProgress = dungeon.getAllProgress();
  for (const info of Object.values(DUNGEON_DEFINITIONS)) {
    const progress = allProgress[info.id];
    const button = node("button", "dungeon-card" + (info.id === dungeon.getDungeonInfo().id ? " selected" : ""));
    button.type = "button";
    button.dataset.dungeonId = info.id;
    button.setAttribute("aria-pressed", String(info.id === dungeon.getDungeonInfo().id));
    const art = node("span", "dungeon-card-art");
    art.setAttribute("aria-hidden", "true");
    const artImage = document.createElement("img");
    artImage.src = info.art ?? "";
    artImage.alt = "";
    artImage.loading = "lazy";
    artImage.decoding = "async";
    art.append(artImage);

    const shade = node("span", "dungeon-card-shade");
    shade.setAttribute("aria-hidden", "true");

    const heading = node("span", "dungeon-card-head");
    heading.append(
      node("span", "dungeon-icon", info.icon ?? "🗺️"),
      node("strong", "dungeon-name", info.name)
    );

    const footer = node("span", "dungeon-card-footer");
    footer.append(
      node("span", "dungeon-meta", info.difficulty + " · 推奨 LV." + info.recommendedLevel),
      node("span", "dungeon-progress",
        progress.cleared
          ? "✓ 制覇済み"
          : "解放 " + progress.unlockedFloor + " / " + progress.maxFloors + "階")
    );
    button.setAttribute("aria-label", info.name + "、" + info.difficulty + "、推奨レベル " + info.recommendedLevel);
    button.append(art, shade, heading, footer);
    root.append(button);
  }
}
function renderFloors() {
  const info = dungeon.getDungeonInfo();
  const progress = dungeon.getProgress();
  const root = $("floorGrid");
  root.replaceChildren();
  $("dungeonPage").dataset.dungeonTheme = info.theme ?? "default";
  $("floorHeading").textContent = info.name + " · 階層選択";
  $("floorHint").textContent = "解放済みの階層は何度でも挑戦OK。初回制覇ボーナスは各ダンジョン1回だけ。";
  selectedFloor = progress.floor;

  for (let floor = 1; floor <= progress.maxFloors; floor += 1) {
    const unlocked = floor <= progress.unlockedFloor;
    const isSelected = floor === selectedFloor;
    const isBoss = floor === progress.maxFloors;
    const isCleared = unlocked && floor < progress.unlockedFloor;
    const stateClass = !unlocked ? "floor-card--locked" : isCleared ? "floor-card--cleared" : "floor-card--available";
    const classes = ["floor-card", stateClass, isBoss ? "floor-card--boss" : "", isSelected ? "selected" : ""]
      .filter(Boolean).join(" ");
    const button = node("button", classes);
    button.type = "button";
    button.dataset.floor = String(floor);
    button.dataset.floorState = !unlocked ? "locked" : isCleared ? "cleared" : "available";
    button.disabled = !unlocked || store.getState().phase !== GAME_PHASE.TITLE;
    button.setAttribute("aria-pressed", String(isSelected));
    const statusText = !unlocked ? "🔒 未解放" :
      (isBoss && progress.dungeonCleared ? "👑 撃破済み" :
        isCleared ? "✓ クリア済み" : isBoss ? "ボス挑戦" : "挑戦可能");
    button.setAttribute("aria-label", info.name + " " + floor + "階" +
      (isBoss ? "、最深部・ボス階層" : "") + "、" + statusText);
    button.append(node("strong", "floor-name", isBoss ? floor + "階 · 最深部" : floor + "階"));
    button.append(node("span", "floor-status", statusText));
    if (isBoss) button.append(node("span", "boss-note", "BOSS"));
    root.append(button);
  }

  $("selectedDungeonName").textContent = info.icon + " " + info.name;
  $("selectedFloorLabel").textContent = selectedFloor + "階を選択中";
  $("adventureButton").href = "./battle.html";
  $("adventureButton").textContent = selectedFloor + "階から挑戦する →";
  $("adventureButton").setAttribute("aria-disabled", "false");
}
function render() {
  $("goldValue").textContent = store.getState().inventory.gold + " G";
  renderDungeons();
  renderFloors();
}
$("dungeonGrid").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-dungeon-id]");
  if (!button || button.disabled) return;
  const id = button.dataset.dungeonId;
  if (id === dungeon.getDungeonInfo().id) return;
  const result = dungeon.selectDungeon(id);
  if (!result.selected) {
    $("feedback").textContent = "今はダンジョンを変更できないよ。";
    return;
  }
  selectedFloor = 1;
  saveAndRender(result.dungeon.name + "を選んだよ。");
});
$("floorGrid").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-floor]");
  if (!button || button.disabled) return;
  const result = dungeon.selectFloor(Number(button.dataset.floor));
  if (!result.selected) {
    $("feedback").textContent = result.reason === "floor-locked"
      ? "この階層はまだ解放されていないよ。" : "階層を選択できなかったよ。";
    return;
  }
  selectedFloor = result.floor;
  saveAndRender(result.floor + "階を選んだよ。");
});
$("adventureButton").addEventListener("click", (event) => {
  if (store.getState().phase !== GAME_PHASE.TITLE) {
    event.preventDefault();
    $("feedback").textContent = "先にホームへ戻ってから出発してね。";
    return;
  }
  const saved = saves.save();
  if (!saved.saved) {
    event.preventDefault();
    $("feedback").textContent = "出発前の保存に失敗したよ。もう一度試してね。";
  }
});
store.subscribe(render);
render();
if (session.initialLoad.loaded) $("feedback").textContent = "冒険データを読み込んだよ。";
window.addEventListener("pagehide", () => saves.save());
