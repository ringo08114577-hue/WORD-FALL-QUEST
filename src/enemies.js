/**
 * WORD FALL QUEST - Data-driven enemy and ability catalog.
 */
const defineEnemy=(definition)=>Object.freeze({...definition,abilities:Object.freeze([...(definition.abilities??[])])});
export const ENEMY_ABILITY_DEFINITIONS=Object.freeze({
  swift:Object.freeze({id:"swift",name:"すばやい反撃",description:"間違った文字への反撃が1強くなる。",counterAttackBonus:1}),
  guard:Object.freeze({id:"guard",name:"かたい体",description:"単語攻撃で受けるダメージを1減らす。",damageReduction:1}),
  piercing:Object.freeze({id:"piercing",name:"防御突破",description:"反撃時にプレイヤーの防御力を1無視する。",defensePiercing:1}),
  crushing:Object.freeze({id:"crushing",name:"重い一撃",description:"間違った文字への反撃が1強くなる。",counterAttackBonus:1}),
});
export const ENEMY_DEFINITIONS=Object.freeze({
  slime:defineEnemy({id:"slime",name:"スライム",maxHp:3,attackPower:1,experienceReward:10,abilities:[]}),
  bat:defineEnemy({id:"bat",name:"コウモリ",maxHp:3,attackPower:1,experienceReward:12,abilities:["swift"]}),
  goblin:defineEnemy({id:"goblin",name:"ゴブリン",maxHp:4,attackPower:1,experienceReward:15,abilities:["guard"]}),
  orc:defineEnemy({id:"orc",name:"オーク",maxHp:5,attackPower:2,experienceReward:20,abilities:["piercing"]}),
  "moss-golem":defineEnemy({id:"moss-golem",name:"こけゴーレム",maxHp:7,attackPower:2,experienceReward:28,abilities:["guard","crushing"]}),
  "forest-dragon":defineEnemy({id:"forest-dragon",name:"森のドラゴン",maxHp:10,attackPower:2,experienceReward:55,isBoss:true,abilities:["swift","guard","piercing"]}),
});
const FLOOR_ENCOUNTER_SETS=Object.freeze([
  Object.freeze(["slime","bat","goblin"]),
  Object.freeze(["bat","orc","moss-golem"]),
  Object.freeze(["goblin","moss-golem","forest-dragon"]),
]);
export function getFloorEnemyIds(floor){
  if(!Number.isSafeInteger(floor)||floor<1)throw new TypeError("floorは1以上の整数にしてください。");
  return [...FLOOR_ENCOUNTER_SETS[(floor-1)%FLOOR_ENCOUNTER_SETS.length]];
}
export function getEnemyAbilityEffects(enemy){
  const effects={counterAttackBonus:0,damageReduction:0,defensePiercing:0};
  for(const abilityId of (Array.isArray(enemy?.abilities)?enemy.abilities:[])){
    const ability=Object.hasOwn(ENEMY_ABILITY_DEFINITIONS,abilityId)?ENEMY_ABILITY_DEFINITIONS[abilityId]:null;
    if(!ability)continue;
    effects.counterAttackBonus+=ability.counterAttackBonus??0;
    effects.damageReduction+=ability.damageReduction??0;
    effects.defensePiercing+=ability.defensePiercing??0;
  }
  return effects;
}
export function createEnemy(enemyId,{floor=1}={}){
  const definition=Object.hasOwn(ENEMY_DEFINITIONS,enemyId)?ENEMY_DEFINITIONS[enemyId]:null;
  if(!definition)throw new RangeError("登録されていない敵です: "+enemyId);
  if(!Number.isSafeInteger(floor)||floor<1)throw new TypeError("floorは1以上の整数にしてください。");
  const difficulty=floor-1;
  return {...definition,abilities:[...definition.abilities],isBoss:definition.isBoss===true,
    maxHp:definition.maxHp+difficulty,
    attackPower:definition.attackPower+Math.floor(difficulty/3),
    experienceReward:definition.experienceReward+difficulty*2};
}