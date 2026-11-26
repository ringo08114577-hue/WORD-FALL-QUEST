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
    "japanesePrompt", "spellingProgress", "arena", "lettersLayer", "typingInput",
    "startButton",
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


test("word battle accepts letters by typing and removes the old number/lane controls", () => {
  assert.match(html, /id="typingInput"/);
  assert.match(html, /inputmode="text"/);
  assert.match(html, /typingInput\.addEventListener\("input"/);
  assert.match(html, /window\.addEventListener\("keydown"/);
  assert.match(html, /function typeSpellingLetter\(rawLetter\)/);
  assert.match(html, /resolveTypedLetterSelection\(wordState, rawLetter\)/);
  assert.match(html, /wordState = setPlayerLane\(wordState, selection\.lane\)/);
  assert.doesNotMatch(html, /leftButton|rightButton|confirmButton|selectLaneAndConfirm|numberKey/);
  assert.doesNotMatch(html, /数字キー1〜5|レーンを1回タップ|bindLaneMoveButton/);
  assert.doesNotMatch(html, /\$\("arena"\)\.addEventListener\("click"/);
});

test("a key that is not an available choice shows a distinct typo cue without an immediate combat event", () => {
  const start = html.indexOf("function typeSpellingLetter(rawLetter)");
  const end = html.indexOf("function showTypingMistake", start);
  const handler = html.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(handler, /selection\.status === "not-choice" \|\| selection\.status === "disabled"/);
  assert.match(handler, /showTypingMistake\(selection\.letter/);
  assert.match(handler, /return;/);
  assert.ok(handler.indexOf("return;") < handler.indexOf("confirmLaneLetter();"));
  assert.doesNotMatch(handler, /handleWordEvents|combat\.handle/);
  assert.match(html, /judgement-feedback\.typing-error/);
  assert.match(html, /\.typing-input\.typing-mistake/);
  assert.match(html, /タイプミス！/);
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



test("PC shortcut hints appear only on visible retry, next-skill, and home buttons", () => {
  assert.match(html, /function setKeyboardShortcut\(button, key\)/);
  assert.match(html, /button\.dataset\.keyboardShortcut = key/);
  assert.match(html, /button\.dataset\.shortcutHint = key/);
  assert.match(html, /state\.phase === GAME_PHASE\.DEFEAT \|\|\s*\(state\.phase === GAME_PHASE\.VICTORY && !dungeonProgress\.floorCleared\)\s*\? "Enter"\s*:\s*null/);
  assert.match(html, /"次の敵へ"/);
  assert.match(html, /setKeyboardShortcut\([\s\S]*?state\.phase === GAME_PHASE\.VICTORY && !dungeonProgress\.floorCleared/);
  assert.match(html, /setKeyboardShortcut\(\$\("nextButton"\), \$\("nextButton"\)\.hidden \? null : "Enter"\)/);
  assert.match(html, /setKeyboardShortcut\(\$\("homeButton"\), \$\("homeButton"\)\.hidden \? null : "Backspace"\)/);
  assert.match(html, /button\[data-shortcut-hint\]::after/);
});

test("Enter, Backspace, and 1-4 only activate matching visible and labelled buttons", () => {
  const start = html.indexOf('window.addEventListener("keydown", (event) => {');
  const end = html.indexOf('store.subscribe((state, action) => {', start);
  const handler = html.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(handler, /event\.key === "Enter"/);
  assert.match(handler, /!button\.hidden && button\.dataset\.keyboardShortcut === "Enter"/);
  assert.match(handler, /event\.key === "Backspace"/);
  assert.match(handler, /!homeButton\.hidden && homeButton\.dataset\.keyboardShortcut === "Backspace"/);
  assert.match(handler, /\/\^\[1-4\]\$\//);
  assert.match(handler, /button\.dataset\.keyboardShortcut === event\.key/);
  assert.match(handler, /!\$\("skillPanel"\)\.hidden/);
  assert.match(handler, /enterAction\.click\(\)|homeButton\.click\(\)|skillButton\.click\(\)/);
});

test("the first four visible equipped skills display matching number-key hints", () => {
  assert.match(html, /if \(visibleSkillCount <= 4\) \{\s*button\.dataset\.keyboardShortcut = String\(visibleSkillCount\)/);
  assert.match(html, /getSkillDisplayName\(skillId, evolved\) \+\s*\(visibleSkillCount <= 4 \? " \[" \+ visibleSkillCount \+ "\]" : ""\)/);
  assert.match(html, /button\.dataset\.keyboardShortcut === event\.key/);
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


test("英語バトルの所持品欄には所持している回復アイテムだけを表示する", () => {
  assert.match(html, /aria-label="回復アイテム"/);
  assert.match(html, /<h2>🧪 回復アイテム<\/h2>/);
  assert.match(html, /import \{ getBattleRecoveryItems \} from "\.\/src\/battle-inventory\.js"/);
  assert.match(html, /const recoveryItems = getBattleRecoveryItems\(state\.inventory\)/);
  assert.match(html, /回復アイテムを持っていないよ。/);
  assert.match(html, /button\.dataset\.itemAction = "use"/);
  assert.doesNotMatch(html, /EQUIPMENT_SLOT_LABELS|アイテム欄で変更|使用不可/);
});

test("バトルで選べる技はステータス画面で装備したスキルだけ", () => {
  assert.match(html, /const equippedSkillIds = state\.equippedSkillIds/);
  assert.match(html, /button\.hidden = !isEquipped/);
  assert.match(html, /currentState\.equippedSkillIds\.includes\(skillId\)/);
});

test("バトルのスキル選択ボタンは4キャラクターの専用技をカタログから生成する", () => {
  assert.match(html, /id="skillOptions"/);
  assert.match(html, /function buildSkillButtons\(\)/);
  assert.match(html, /Object\.entries\(SKILL_DEFINITIONS\)/);
  assert.match(html, /button\.dataset\.skill = skillId/);
  assert.match(html, /buildSkillButtons\(\)/);
  assert.match(html, /getSkillWordDifficultyRange\(skillId, level\)/);
  assert.match(html, /getSkillEffectForLevel\(skillId, level, evolved\)/);
  assert.deepEqual(Object.keys(SKILL_DEFINITIONS), [
    "gou-basic", "regen-basic", "shadow-basic", "elemental-basic",
  ]);
  assert.deepEqual(Object.values(SKILL_DEFINITIONS).map((skill) => skill.characterId), [
    "gou-swordsman", "regen-knight", "shadow-blade", "elemental-mage",
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



test("PCとスマホは英字タイピングで選択でき、数字キーやレーンタップ操作は使わない", () => {
  assert.match(html, /id="typingInput"/);
  assert.match(html, /lang="en"/);
  assert.match(html, /inputmode="text"/);
  assert.match(html, /typingInput\.addEventListener\("input"/);
  assert.match(html, /typingInput\.addEventListener\("keydown"/);
  assert.match(html, /window\.addEventListener\("keydown"/);
  assert.match(html, /typeSpellingLetter\(event\.key\)/);
  assert.match(html, /\$\("typingInput"\)\.disabled = !canType/);
  assert.match(html, /target === typingInput/);
  assert.doesNotMatch(html, /数字キー1〜5|レーンを1回タップ/);
  assert.doesNotMatch(html, /bindLaneMoveButton|selectLaneAndConfirm|numberKey/);
  assert.doesNotMatch(html, /\$\("arena"\)\.addEventListener\("click"/);
});


test("レーン選択は控えめに光り、間違えた文字と引っかけ1つを無効化して表示する", () => {
  assert.match(html, /id="laneFocus"/);
  assert.match(html, /\.lane-focus\s*\{[\s\S]*?box-shadow:inset 0 0 18px/);
  assert.match(html, /\.lane-focus\.pulse\s*\{\s*animation:laneFocusPulse/);
  assert.match(html, /id="judgementFeedback" role="status"/);
  assert.match(html, /function showJudgementFeedback\(type, letter, expected\)/);
  assert.match(html, /"正解！"/);
  assert.match(html, /"不正解！選んだ文字と引っかけ1つを無効にしたよ。並びはそのまま！"/);
  assert.match(html, /\.lane-letter-disabled\s*\{/);
  assert.match(html, /isDisabled \? " lane-letter-disabled" : ""/);
  assert.match(html, /showJudgementFeedback\(event\.type, event\.letter, event\.expected\)/);
  assert.match(html, /type === "wrong" \? 1400 : 760/);
  assert.doesNotMatch(html, /正解は " \+ expected/);
});

test("正誤判定SEはWeb Audioで鳴り、非対応環境でもゲームを止めない", () => {
  assert.match(html, /function playJudgementSe\(type\)/);
  assert.match(html, /window\.AudioContext \|\| window\.webkitAudioContext/);
  assert.match(html, /context\.createOscillator\(\)/);
  assert.match(html, /oscillator\.frequency\.setValueAtTime/);
  assert.match(html, /context\.resume\(\)\.then\(play\)\.catch\(\(\) => \{\}\)/);
  assert.match(html, /catch \{\s*\/\/ Sound is an optional enhancement/);
  assert.match(html, /playJudgementSe\(event\.type\)/);
});


test("バトル画面は専用設定ページのレーン発光設定を読み込む", () => {
  assert.doesNotMatch(html, /id="laneFlashIntensity"/);
  assert.match(html, /href="\.\/settings\.html">⚙ 設定<\/a>/);
  assert.match(html, /wordFallQuestLaneFlashIntensity/);
  assert.match(html, /laneFlashIntensityOptions\.includes\(savedIntensity\)/);
  assert.match(html, /laneFocus"\)\.dataset\.flashIntensity = initialLaneFlashIntensity/);
  assert.match(html, /\.lane-focus\[data-flash-intensity="none"\]\.pulse\s*\{\s*animation:none/);
  assert.match(html, /\.lane-focus\[data-flash-intensity="weak"\]\.pulse/);
  assert.match(html, /\.lane-focus\[data-flash-intensity="normal"\]\.pulse/);
  assert.match(html, /\.lane-focus\[data-flash-intensity="strong"\]\.pulse/);
});

test("英語バトル画面の主人公画像は全画面サイズで一回り大きい", () => {
  assert.match(html, /\.player\s*\{[\s\S]*?width:72px; height:79px;[\s\S]*?margin-left:-36px/);
  assert.match(html, /\.player\s*\{ width: 62px; height: 62px; margin-left: -31px/);
  assert.match(html, /\.player\s*\{ width:48px; height:48px; margin-left:-24px/);
  assert.match(html, /object-fit:contain/);
});


test("正しい選択を間違えた単語だけ苦手単語帳に保存し、単なるタイプミスは記録しない", () => {
  assert.ok(html.includes('from "./src/weak-words.js"'));
  assert.ok(html.includes("isValidWeakWordEntries"));
  assert.ok(html.includes("weakWords,"));
  const handlerStart = html.indexOf("function handleWordEvents(events)");
  const handlerEnd = html.indexOf('$("inventoryItems").addEventListener', handlerStart);
  const handler = html.slice(handlerStart, handlerEnd > handlerStart ? handlerEnd : handlerStart + 1800);
  assert.ok(handler.includes('event.type === "wrong"'));
  assert.ok(handler.includes("recordWeakWordMistake(weakWords, getCurrentChallenge(wordState))"));
  const typingStart = html.indexOf("function typeSpellingLetter(rawLetter)");
  const typingEnd = html.indexOf("function showTypingMistake", typingStart);
  assert.doesNotMatch(html.slice(typingStart, typingEnd), /recordWeakWordMistake/);
});
