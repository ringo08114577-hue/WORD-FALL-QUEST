import test from "node:test";
import assert from "node:assert/strict";
import { SKILL_DEFINITIONS } from "./skills.js";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../battle.html", import.meta.url), "utf8");

test("battle page gives English gameplay more than half of the desktop and tablet width", () => {
  assert.match(html, /class="battle-layout"/);
  assert.match(html, /class="game-column"/);
  assert.match(html, /class="info-column"/);
  assert.match(html, /grid-template-columns:\s*minmax\(0,\s*1\.55fr\)\s+minmax\(270px,\s*1fr\)/);
  assert.match(html, /grid-template-columns:\s*minmax\(0,\s*1\.6fr\)\s+minmax\(320px,\s*1fr\)/);
  assert.match(html, /@media\s*\(min-width:\s*720px\)/);
});

test("battle layout keeps gameplay, HP, and inventory while hiding manual save controls", () => {
  for (const id of [
    "japanesePrompt", "spellingProgress", "arena", "lettersLayer",
    "leftButton", "confirmButton", "rightButton", "startButton",
    "nextButton", "homeButton", "enemyImage", "enemyHp", "enemyHpFill", "playerHp", "playerHpFill",
    "enemyAttackTimer", "inventoryItems", "townBackLink",
  ]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  for (const id of ["saveNowButton", "loadSaveButton", "clearSaveButton", "saveMessage"]) {
    assert.doesNotMatch(html, new RegExp('id="' + id + '"'));
  }
  assert.doesNotMatch(html, /aria-label="セーブデータ"|💾 セーブデータ/);
  assert.match(html, /const initialSave = saveController\.load\(\)/);
  assert.match(html, /function saveProgress\(\)\s*\{\s*return saveController\.save\(\);\s*\}/);
});

test("主人公と敵は共通画像ローダーを使い、画像未登録時は仮画像へ切り替える", () => {
  assert.match(html, /<img class="enemy-image" id="enemyImage" alt="" hidden>/);
  assert.match(html, /<img class="player" id="playerSprite" alt="主人公" hidden>/);
  assert.match(html, /import \{ setCharacterImage, clearCharacterImage \} from "\.\/src\/character-images\.js"/);
  assert.match(html, /setCharacterImage\(playerImageElement, "hero"/);
  assert.match(html, /setCharacterImage\(enemyImage, enemy\.id/);
  assert.match(html, /clearCharacterImage\(enemyImage\)/);
  assert.match(html, /baseUrl: document\.baseURI/);
});

test("mobile layout retains a single-column fallback", () => {
  assert.match(html, /@media\s*\(max-width:\s*480px\)/);
  assert.match(html, /\.battle-layout\s*\{\s*display:flex;\s*flex-direction:column/);
  assert.match(html, /\.game-column,\s*\.info-column\s*\{\s*display:contents/);
  assert.ok(html.includes(".arena { height:clamp(205px, 34svh, 280px); min-height:205px; }"));
});

test("tablet and desktop columns remain real grid items with a compact lane frame", () => {
  assert.match(html, /\.game-column,\s*\.info-column\s*\{\s*display:\s*block;\s*min-width:\s*0;\s*\}/);
  assert.match(html, /height: clamp\(230px, 34svh, 350px\); min-height: 230px;/);
  assert.match(html, /height: clamp\(250px, 36svh, 380px\); min-height: 250px;/);
});

test("every DOM id is unique and every static script lookup resolves exactly once", () => {
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  assert.equal(ids.length, counts.size, "同じidを持つ画面部品が重複しています");
  for (const match of html.matchAll(/\$\("([^"]+)"\)/g)) {
    assert.equal(counts.get(match[1]), 1, "JavaScript参照 #" + match[1] + " は1個だけ存在する必要があります");
  }
});

test("orphaned duplicate battle markup is removed", () => {
  assert.equal(html.split('elling" id="spellingProgress"').length - 1, 1);
  const asideEnd = html.indexOf("</aside>");
  const footerStart = html.indexOf('<p class="footer">');
  assert.ok(asideEnd >= 0 && footerStart > asideEnd);
  assert.match(html.slice(asideEnd, footerStart), /^<\/aside>\s*<\/div>\s*$/);
});

test("battle arena is compact at short-phone, phone, tablet, and desktop sizes", () => {
  assert.ok(html.includes("main { width: min(100%, 1280px); }"));
  assert.ok(html.includes("height:clamp(180px, 30svh, 225px); min-height:180px;"));
  assert.ok(html.includes("height:clamp(205px, 34svh, 280px); min-height:205px;"));
  assert.ok(html.includes("height:clamp(230px, 38svh, 340px); min-height:230px;"));
});


test("lane movement buttons respond to touch pointer presses and remain keyboard accessible", () => {
  assert.match(html, /function bindLaneMoveButton\(buttonId, direction\)/);
  assert.match(html, /button\.addEventListener\("pointerdown"/);
  assert.match(html, /event\.preventDefault\(\);\s*move\(direction\);/);
  assert.match(html, /button\.addEventListener\("click", \(event\) => \{\s*if \(event\.detail === 0\) move\(direction\);/);
  assert.match(html, /bindLaneMoveButton\("leftButton", -1\)/);
  assert.match(html, /bindLaneMoveButton\("rightButton", 1\)/);
  assert.ok(html.includes(".move-button { flex:1; min-width:0; min-height:52px; padding:9px 8px; font-size:.88rem; touch-action:manipulation;"));
});


test("lane movement buttons have reliable touch targets and a legacy touch fallback", () => {
  assert.match(html, /\.move-button \{ min-height:48px; \}/);
  assert.match(html, /min-height:52px; padding:9px 8px/);
  assert.match(html, /if \(!\("PointerEvent" in window\)\) \{/);
  assert.match(html, /button\.addEventListener\("touchstart"/);
  assert.match(html, /\{ passive: false \}/);
  assert.match(html, /event\.button !== 0 \|\| button\.disabled/);
});


test("enemy attack countdown shows a visible three-second warning and progress meter", () => {
  assert.match(html, /id="enemyAttackMeter"/);
  assert.match(html, /id="enemyAttackMeterFill"/);
  assert.match(html, /getEnemyAttackWarningState\(attackElapsed, attackInterval\)/);
  assert.match(html, /attackClock\.isWarning/);
  assert.match(html, /⚠ 攻撃予告！あと /);
  assert.match(html, /\.enemy-attack-timer\.warning/);
  assert.match(html, /\.enemy-attack-meter\.warning/);
});


test("バトル画面に一時停止ボタンや自動一時停止処理を表示しない", () => {
  assert.doesNotMatch(html, /pauseButton|toggleBattlePause|pauseBattleForInterruption/);
  assert.doesNotMatch(html, /visibilitychange/);
  assert.doesNotMatch(html, /一時停止中/);
  assert.match(html, /window\.addEventListener\("pagehide", \(\) => \{\s*saveProgress\(\);\s*\}\)/);
  assert.match(html, /\$\("startButton"\)\.hidden = inBattle/);
});

test("旧セーブが一時停止状態ならロード時に自動でバトルを再開する", () => {
  assert.match(html, /const resumedLegacyPause = initialSave\.loaded &&\s*store\.getState\(\)\.phase === GAME_PHASE\.PAUSED/);
  assert.match(html, /if \(resumedLegacyPause\) \{\s*store\.dispatch\(\{ type: GAME_ACTION\.RESUME_BATTLE \}\);\s*saveController\.save\(\);/);
});


test("バトルで選べる技はステータス画面で装備したスキルだけ", () => {
  assert.match(html, /const equippedSkillIds = state\.equippedSkillIds/);
  assert.match(html, /button\.hidden = !isEquipped/);
  assert.match(html, /currentState\.equippedSkillIds\.includes\(skillId\)/);
});

test("バトルのスキル選択ボタンはスキル定義から全6種類を自動生成する", () => {
  assert.match(html, /id="skillOptions"/);
  assert.match(html, /function buildSkillButtons\(\)/);
  assert.match(html, /Object\.entries\(SKILL_DEFINITIONS\)/);
  assert.match(html, /button\.dataset\.skill = skillId/);
  assert.match(html, /buildSkillButtons\(\)/);
  assert.match(html, /getSkillWordDifficultyRange\(skillId, level\)/);
  assert.match(html, /getSkillEffectForLevel\(skillId, level, evolved\)/);
  assert.deepEqual(Object.keys(SKILL_DEFINITIONS), [
    "quick-strike", "power-strike", "ultimate-strike",
    "healing-light", "iron-guard", "battle-cry",
  ]);
  assert.doesNotMatch(html, /getSkillLevelDifficultyRange\(level\)/);
});

test("battle status displays the selected dungeon name from the saved controller state", () => {
  assert.match(html, /dungeon\.getDungeonInfo\(\)\.name \+ " · " \+ dungeonProgress\.floor/);
  assert.match(html, /dungeon\.getDungeonInfo\(\)\.name \+ " · " \+ progress\.floor/);
});


test("敗北時と各階クリア後にホームへ戻るボタンを表示する", () => {
  assert.match(html, /id="homeButton" hidden>ホームへ戻る/);
  assert.match(html, /state\.phase === GAME_PHASE\.DEFEAT \|\|\s*\(state\.phase === GAME_PHASE\.VICTORY && dungeonProgress\.floorCleared\)/);
  assert.match(html, /\$\("homeButton"\)\.addEventListener\("click", returnHome\)/);
  assert.match(html, /function returnHome\(\)[\s\S]*?const canReturnHome = phase === GAME_PHASE\.DEFEAT \|\|\s*\(phase === GAME_PHASE\.VICTORY && progress\.floorCleared\)/);
  assert.match(html, /if \(phase === GAME_PHASE\.VICTORY && !progress\.rewardClaimed\)[\s\S]*?dungeon\.claimFloorReward\(\)/);
  assert.match(html, /town\.returnToTown\(\);[\s\S]*?saveProgress\(\);[\s\S]*?window\.location\.assign\("\.\/index\.html"\)/);
  assert.match(html, /\$\("startButton"\)\.hidden = dungeonProgress\.dungeonCleared/);
});

test("各階クリア時は階層クリア表示とホームへの案内を出す", () => {
  assert.match(html, /dungeonProgress\.floor \+ "階クリア！"/);
  assert.match(html, /「ホームへ戻る」を選ぼう/);
  assert.match(html, /\$\("homeButton"\)\.hidden = !floorCleared/);
});

test("敵撃破後は未制覇なら次の敵・宝箱・次階層へ進むボタンを表示する", () => {
  assert.match(html, /state\.phase === GAME_PHASE\.VICTORY\)[\s\S]*?\$\("startButton"\)\.hidden = dungeonProgress\.dungeonCleared/);
  const labelStart = html.indexOf('$("startButton").textContent =');
  const labelEnd = html.indexOf('$("nextButton").hidden =', labelStart);
  const labelLogic = html.slice(labelStart, labelEnd);
  assert.ok(labelStart >= 0 && labelEnd > labelStart, "進行ボタンの表示テキストが必要です");
  assert.match(labelLogic, /dungeonProgress\.floorCleared/);
  assert.match(labelLogic, /dungeonProgress\.rewardClaimed/);
  assert.match(labelLogic, /"次の敵へ"/);
  assert.match(labelLogic, /"宝箱を開ける"/);
  assert.match(labelLogic, /"次の階へ"/);
});

test("敗北してもプレイヤーの育成データを消さず、現在の階から再挑戦する", () => {
  assert.match(html, /state\.phase === GAME_PHASE\.DEFEAT \? "この階から再挑戦"/);
  assert.match(html, /if \(previousPhase === GAME_PHASE\.DEFEAT\) \{\s*\/\/ Defeat abandons[\s\S]*?GAME_ACTION\.RETURN_TO_TOWN[\s\S]*?dungeon\.reset\(\);\s*\}/);
});


test("バトル画面に最新の行動を表示するログ欄があり、報酬や遭遇も表示できる", () => {
  assert.match(html, /aria-label="バトルログ"/);
  assert.match(html, /id="battleLogList"/);
  assert.match(html, /function renderActionLog\(state\)/);
  assert.match(html, /state\.actionLog\.slice\(/);
  assert.match(html, /encounterStartIndex/);
  assert.match(html, /root\.scrollTop = root\.scrollHeight/);
  assert.match(html, /に遭遇した！/);
});


test("プレイヤー欄に攻撃・防御バフの残り回数を表示する", () => {
  assert.match(html, /state\.battleEffects\?\.attackUsesRemaining > 0/);
  assert.match(html, /state\.battleEffects\?\.defenseHitsRemaining > 0/);
  assert.match(html, /activeBuffs\.join\(" \/ "\)/);
});


test("バトル画面は共通の初期能力値HP100・攻撃力20を使う", () => {
  assert.match(html, /const store = createGameStore\(\);/);
  assert.doesNotMatch(html, /createGameStore\(\{\s*playerMaxHp:\s*3,\s*playerAttackPower:\s*1/);
  assert.match(html, /id="playerHp">HP 100 \/ 100/);
  assert.match(html, /aria-label="プレイヤーHP" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"/);
  assert.match(html, /id="playerProgression">LV\.1 · EXP 0 \/ 100/);
  assert.match(html, /id="equipmentSummary">ATK 20 · DEF 0/);
});


test("数字キー1〜5で直接レーンを選択し、同じ数字の再入力で決定する", () => {
  assert.match(html, /setPlayerLane,\s*canCollectCurrentLaneLetter/);
  assert.match(html, /let lastNumberLane = null/);
  assert.match(html, /const numberKey = \/\^\[1-5\]\$\/\.test\(event\.key\)/);
  assert.match(html, /if \(event\.repeat\) return/);
  assert.match(html, /if \(lastNumberLane === lane\)[\s\S]*?confirmLaneLetter\(\)/);
  assert.match(html, /wordState = setPlayerLane\(wordState, lane\)/);
  assert.match(html, /数字キー1〜5で対応レーンへ直接移動。同じ数字をもう一度押すと決定/);
  assert.match(html, /target\.isContentEditable/);
});
