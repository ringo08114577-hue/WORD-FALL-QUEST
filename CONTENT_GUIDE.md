# WORD FALL QUEST — コンテンツ追加ガイド

このゲームは **データ（src/data/）** と **処理（src/直下）** を分けています。
新しい装備・敵・ダンジョン・技・英単語を追加するときは、まずデータ側のカタログを編集します。

## ファイルの役割

```text
src/data/
  items.js       アイテム・装備・価格・初期所持数
  enemies.js     敵の種類・能力
  dungeons.js    ダンジョン・階層ごとの敵編成・報酬
  skills.js      プレイヤーの技
  words.js       日本語のお題・英単語
src/
  items.js       装備ボーナス・初期所持品の計算
  enemies.js     敵生成・階層補正・能力効果
  dungeon.js     ダンジョン進行・セーブ復元
  skills.js      技データの検索・スキルレベル・強化費用・4枠装備
  word-battle.js スペル進行・レーン操作
  game-state.js  プレイヤー・敵・所持品の状態
  combat.js      戦闘イベント・ダメージ処理
  save-system.js セーブ・ロード・旧データ移行
```

## アイテム・装備
`src/data/items.js` の `ITEM_DEFINITIONS` に追加します。
- 装備品は `slot` を指定（weapon / shield / armor / accessory）。
- `attackBonus` / `defenseBonus` は必要なものだけ指定。
- `shopPrice` を指定するとショップに自動登録。
- `startingQuantity` を指定すると新規ゲームの初期所持数になる。
- 回復薬は現在の形式（type: "consumable", effect: "heal", healAmount）で登録。

## 敵キャラクターと特殊能力
敵の基本情報は `src/data/enemies.js` の `ENEMY_DEFINITIONS` にまとめます。**新しい敵を追加するときは、まずこのカタログへ登録**します。

各キャラには次の項目を設定します。
- 基本：`id`、`name`、`rank`（`normal` / `miniBoss` / `boss`）、`description`
- 能力：`maxHp`、`attackPower`、`experienceReward`、`abilities`
- 属性：必要に応じて `attackElement`、`elementalWeakness`、`elementalResistance`
- 出現条件：`encounter`（出現タイプ・ダンジョン・階層・重み）

通常敵の `encounter` は `type: "normal"`、`dungeonIds`、`minFloor`、`maxFloor`、`weight` を設定します。重みが大きいほど抽選されやすく、通常敵は同じ階の中で重複しないよう抽選されます。
中ボスと大ボスは `type: "miniBoss"` / `"boss"` と `dungeonIds`、`minFloor` / `maxFloor` または `floors`、必要なら `weight` を設定します。中ボスは通常階、大ボスは指定されたボス階に選ばれます。

特殊能力IDと説明・数値効果は同ファイルの `ENEMY_ABILITY_DEFINITIONS` に登録します。現在の効果キーは `counterAttackBonus`、`damageReduction`、`defensePiercing` です。新しい効果の種類を増やす場合だけ、処理側の `combat.js` も変更します。

敵のドロップは `src/data/enemy-drops.js` に敵IDごとに登録します。素材は `src/data/items.js` の `ITEM_DEFINITIONS` に追加し、名前は `モンスター名 + の + 素材名` にします。通常素材1は60%、通常素材2は30%、レア素材は5%の独立抽選が基本です。
キャラ画像は `src/character-images.js` の `CHARACTER_IMAGE_CATALOG` に同じ敵IDで登録します。画像がまだない場合は `image: null` とし、共通仮画像を使います。

## ダンジョンと階層
ダンジョン本体は `src/data/dungeons.js` の `DUNGEON_DEFINITIONS` に登録します。敵の出現先・階層・出現率は敵側の `encounter` に書くため、敵を追加するたびに階層編成表を手作業で作り直す必要はありません。

ランダム編成を使うダンジョンには `encounterPlan` を設定します。
```js
encounterPlan: Object.freeze({
  enemiesPerFloor: 5,
  normalEnemyCount: 4,
  majorBossEveryFloors: 5,
})
```
この設定なら各階5体、通常敵4体を重み付き・重複なしで抽選し、最後の1体を特別枠にします。5の倍数階は大ボス、それ以外は中ボスです。ボス候補は各敵の `encounter` に登録します。

現在の「はじまりの森」はこの方式で、雑魚8体・中ボス4体・森のドラゴンを登録済みです。4体の中ボスは各キャラの `floors` 設定に従って固定配置されます（森は1階グランヴェル、2階モルガル、3階ログガル、4階ヴォルグリフ）。「氷結の洞窟」は専用中ボスが決まるまで既存の固定編成を維持しています。新しいダンジョンにランダム編成を設定するときは、そのダンジョン用の通常敵・中ボス・大ボスを先に登録してください。

`reward` に階層報酬、`clearReward` に初回制覇報酬を設定します。参照する敵・アイテムIDは各カタログに登録済みである必要があります。
`src/dungeon.js` は階層解放・制覇記録・現在の敵編成を管理します。ランダム抽選した編成IDはセーブデータにも保存されるため、途中で再開しても敵の順番は変わりません。
ホームへ戻ると挑戦中の階層を最初の敵からやり直しますが、解放済み階層・レベル・経験値・所持品・装備・スキルレベルは維持します。HPは全回復します。
現在のセーブ形式はバージョン13です。旧バージョンのセーブは段階的に移行します。

## 技と英単語
- 技：`src/data/skills.js` に追加。各技は `category`（attack / heal / defense / support）、対応する文字数、`startingLevel`、`maxLevel`、`upgradeCosts` を持ちます。補助系は `wordDifficultyRange: { min: 1, max: 2 }` を指定すると、レベルに関係なく簡単な単語で発動します。
- 強化費用はLv.1→2が50G、Lv.2→3が100G、Lv.3→4が200G、Lv.4→5が400Gです。強化は街のスキル工房で行い、戦闘中と敗北中はできません。
- スキルレベルはゲーム本体のセーブ状態に保存されます。過去のセーブにスキルレベル情報がない場合は、各技Lv.1として補完します。
- お題：`src/data/words.js` に `id`、`japanese`、大文字の `word`、`difficulty`（1〜6）、`partOfSpeech` を追加します。
- `id` は小文字英数字とハイフンの安定した一意IDにします。既存IDは変更せず、既存単語の配列順も変えず、追加語は末尾へ追加します（進行中セーブの番号ずれ防止）。
- `partOfSpeech` は `noun` / `verb` / `adjective` / `adverb` / `preposition` / `conjunction` / `pronoun` / `determiner` / `interjection` / `other` のいずれかです。
- 必要な場合は `alternateMeanings` に追加の日本語訳を文字列配列で指定できます。主表示には従来どおり `japanese` を使います。
- 追加前に `validateWordCatalog`（`src/data/word-validation.js`）でID・意味・スペル・難易度・品詞・重複を検査します。同じスペルで異なる品詞は警告として確認します。
- 攻撃スキルのLv.1〜5の出題範囲は `src/word-difficulty.js` で管理します（Lv.1：難易度1〜2、Lv.2：1〜3、Lv.3：2〜4、Lv.4：3〜5、Lv.5：4〜6）。回復・防御・補助スキルは定義側の難易度範囲を優先できます。
- 出題は範囲内の難易度ウェイト（35/25/18/12/7/3）で抽選し、その難易度の候補から単語を選びます。候補がない難易度は抽選対象から除外してウェイトを再計算します。
- 難易度別攻撃倍率（1/1.5/2.2/3.2/4.8/7）は `src/word-difficulty.js` にあります。技の威力倍率と掛け合わせ、敵の軽減を適用します。
- スキルレベルはゲーム本体のセーブ状態に保存され、街とバトル画面で共通して利用します。

## 追加後の確認
`npm test` を実行します。カタログ間のID参照や技に合う単語が登録されているかも自動確認します。


## セーブデータとの互換性
アイテムや装備枠を後から追加しても、現在のセーブ形式を読み込むときに不足キーを自動補完します。既存アイテムの所持数は維持し、新しく追加したアイテムは `startingQuantity`、未指定なら0個で補完します。英単語のお題は、進行中セーブの番号がずれないよう既存データの末尾に追加してください。


## 冒険者ホームと施設（STEP 23）
`index.html` は冒険者ホームです。道具屋 `items.html`、装備屋 `equipment.html`、スキル工房 `skills.html`、ダンジョン選択 `dungeons.html` はそれぞれ独立したページです。
ページ間で `src/app-session.js` を共有し、同じセーブデータ・ゲーム状態を利用します。
ホームへ戻るとHPが自動で全回復します。宿屋はありません。ホーム帰還時は挑戦中の階層をリセットし、解放済みの階層・所持品・装備・経験値・スキルレベルを維持します。
ダンジョン選択画面では、ダンジョンごとに独立した解放階層を表示します。各階層は順番に解放されますが、一度解放した階層は自由に選択して周回できます。

## STEP 23 ページ構成
- `index.html`：冒険者ホーム。帰還時にHPを自動全回復。
- `items.html`：道具屋。
- `equipment.html`：装備屋。装備の購入と付け替え。
- `skills.html`：スキル工房。
- `dungeons.html`：ダンジョン・階層選択。
- `battle.html`：選択した階層の戦闘。途中でホームへ戻ると同じ階層の1体目から再開。


## STEP 24 制覇報酬の設定
ダンジョンの `clearReward` に、初回制覇時に与える素材ID・個数・追加ゴールドを指定します。報酬素材は `src/data/items.js` に `type: "material"` として追加し、ショップ価格は設定しません。
初回制覇報酬は各ダンジョン1回のみです。通常の階層宝箱は周回時も獲得できます。制覇フラグは `completedDungeons` に記録されるため、セーブデータのバージョンは5のままです。


## STEP 25 ステータス画面とスキル装備

- `status.html` はレベル・HP・経験値・攻撃力・防御力・所持ゴールド・討伐数を表示します。
- スキル装備は4枠です。`equippedSkillIds` に4つのスロットを配列で保存し、`null` は未装備を表します。
- 同じスキルの重複装備と、すべての枠を空にする操作はできません。
- バトルの技選択には装備中のスキルだけを表示します。装備変更はステータス画面、レベル強化はスキル工房で行います。
- STEP 25当時のセーブ形式はバージョン6です。現在はバージョン8で、旧セーブは段階的に移行します。


## STEP 27 回復・防御・補助スキル

- 追加スキル「いやしの光」「鉄壁の構え」「力の咆哮」を登録。初期装備の3攻撃スキルは変更しない。
- 回復・防御・補助は3〜4文字・難易度1〜2の英単語で発動し、スキルレベルに応じて効果が成長する。
- 「いやしの光」はHP回復、「鉄壁の構え」は次の敵攻撃2回を軽減、「力の咆哮」は次の攻撃2回を強化。
- バトル画面のスキル選択はスキルカタログから動的に生成する。
- 戦闘中の一時効果はセーブ・ロードに対応し、勝利・敗北・街への帰還で解除する。
- セーブ形式はバージョン8。バージョン7以前のセーブは一時効果なしで移行する。
