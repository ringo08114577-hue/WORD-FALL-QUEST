/**
 * Playable fighting styles for the single main adventurer.
 * Character artwork is represented by temporary icons until final art is ready.
 */
export const DEFAULT_CHARACTER_ID = "gou-swordsman";
export const CHARACTERS = Object.freeze([
  Object.freeze({ id:"gou-swordsman", name:"轟剣士", title:"蓄積・一撃必殺", icon:"⚔️", accent:"#d78356",
    description:"轟気を何重にも蓄え、最後にすべてを解放して最大火力を叩き込む。",
    strength:"全キャラクター最高の瞬間火力。ボスのギミックを力で破壊する。",
    challenge:"準備中は道中の攻略が難しく、轟気を使うタイミングの判断が重要。" }),
  Object.freeze({ id:"regen-knight", name:"再生騎士", title:"回復・持久戦", icon:"🛡️", accent:"#6bb89a",
    description:"ドレイン攻撃でHPを回復し、あふれた生命力をオーバーHPに変えて戦う。長期戦で格上にも粘り強く勝てる。",
    strength:"高い耐久力と、蓄えたオーバーHPを活かした安定火力。",
    challenge:"高火力を出すにはオーバーHPの蓄積が必要。敵を倒すとオーバーHPは消える。" }),
  Object.freeze({ id:"shadow-blade", name:"影刃", title:"会心・高速連撃", icon:"🗡️", accent:"#a88ae0",
    description:"短い英単語を素早く連続入力し、会心の一撃を重ねる。",
    strength:"高い会心率と連撃性能。短い単語を得意とする。",
    challenge:"会心が安定しないと火力が伸びにくく、入力のテンポが重要。" }),
  Object.freeze({ id:"elemental-mage", name:"元素術師", title:"属性・魔法連鎖", icon:"🔮", accent:"#75a9dc",
    description:"炎・雷・水・風・土の魔法を組み合わせ、属性の連鎖で攻める。",
    strength:"敵の属性に合わせて戦い方を変えられ、魔法の組み合わせが強力。",
    challenge:"魔力や属性の相性を考えてスキルを選ぶ必要がある。" }),
]);
const CHARACTER_BY_ID=Object.freeze(Object.fromEntries(CHARACTERS.map((entry)=>[entry.id,entry])));
export function isValidCharacterId(value){return typeof value==="string"&&Object.hasOwn(CHARACTER_BY_ID,value);}
export function normalizeCharacterId(value){return isValidCharacterId(value)?value:DEFAULT_CHARACTER_ID;}
export function getCharacterDefinition(value){return CHARACTER_BY_ID[normalizeCharacterId(value)];}
