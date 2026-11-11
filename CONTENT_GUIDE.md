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
  skills.js      技データの検索
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

## 敵と特殊能力
`src/data/enemies.js` の `ENEMY_DEFINITIONS` に追加します。
`id`、`name`、`maxHp`、`attackPower`、`experienceReward`、`abilities` を指定し、ボスなら `isBoss: true`。
能力IDは同ファイルの `ENEMY_ABILITY_DEFINITIONS` に登録します。
現在の効果キーは `counterAttackBonus`、`damageReduction`、`defensePiercing`。
新しい種類の効果を増やす場合だけ、処理側の `combat.js` も変更します。

## ダンジョンと階層
`src/data/dungeons.js` の `DUNGEON_DEFINITIONS` に新しいIDで追加します。
`encounterSets` は階層ごとの敵ID配列で、最後まで行くと先頭へ戻ります。
`reward` にゴールドとアイテム報酬を指定します。参照する敵・アイテムIDは各カタログに登録済みである必要があります。
ダンジョンを起動するときは `createDungeonController(store, { dungeonId: "追加したID" })` を使います。
冒険者ホームで登録済みダンジョンを選択できます。新しいダンジョンを追加したら、ホーム画面の選択一覧にもカタログから自動表示されます。
行き先の選択は出発前だけ可能です。選択したダンジョンIDはセーブに記録され、バトル画面を開いても同じ行き先が使われます。探索開始後は途中変更できず、敗北して再挑戦しても選択したダンジョンは維持されます。
セーブにはダンジョンIDを記録し、古いセーブ（IDなし）は「はじまりの森」として復元します。

## 技と英単語
- 技：`src/data/skills.js` に追加。対応する文字数の英単語が必要です。
- お題：`src/data/words.js` に `id`、`japanese`、大文字の `word` を追加。

## 追加後の確認
`npm test` を実行します。カタログ間のID参照や技に合う単語が登録されているかも自動確認します。


## セーブデータとの互換性
アイテムや装備枠を後から追加しても、現在のセーブ形式を読み込むときに不足キーを自動補完します。既存アイテムの所持数は維持し、新しく追加したアイテムは `startingQuantity`、未指定なら0個で補完します。英単語のお題は、進行中セーブの番号がずれないよう既存データの末尾に追加してください。


## 街の施設（STEP 20）
冒険者の街は `index.html` が担当し、施設の処理は既存コントローラーを再利用します。

- 宿屋：`src/town.js` の `createTownController` を使用。料金は `src/game-config.js` の `town.innRestCost` で管理し、現在HPが最大未満のときだけ全回復します。
- 道具屋・武器防具屋：`src/shop.js` の `SHOP_CATALOG` と `createShopController` を使用。商品を `src/data/items.js` に追加して価格を設定すると、種類に応じて施設へ自動表示されます。
- ダンジョン入口：`src/data/dungeons.js` のカタログから行き先を自動表示します。
- 街の施設はタイトル・一時停止・勝利状態で利用できます。戦闘中に街へ戻ると、バトル画面のページ離脱処理が戦闘を一時停止して保存します。街から「冒険に戻る」を選ぶと同じ敵との戦闘を再開できます。
- セーブデータの形式は増やしていません。既存の進行データとの互換性を維持します。
