/**
 * WORD FALL QUEST - Data-driven dungeon progression.
 * Legacy saves finish their current floor with the original enemy order.
 */
import { GAME_ACTION, GAME_PHASE } from "./game-state.js";
import { createEnemy, getFloorEnemyIds } from "./enemies.js";
const LEGACY_ENEMY_IDS=Object.freeze(["slime","bat","goblin"]);
const CURRENT_ENCOUNTER_SET_VERSION=2;
function getEncounterIds(floor,version){return version===1?[...LEGACY_ENEMY_IDS]:getFloorEnemyIds(floor);}
export function createDungeonController(store){
  if(!store||typeof store.getState!=="function"||typeof store.dispatch!=="function")throw new TypeError("dungeon controllerにはgame storeが必要です。");
  let floor=1,enemyIndex=0,started=false,rewardClaimed=false,encounterSetVersion=CURRENT_ENCOUNTER_SET_VERSION;
  const currentIds=()=>getEncounterIds(floor,encounterSetVersion);
  function startCurrentEnemy(){
    const state=store.getState();
    if(![GAME_PHASE.TITLE,GAME_PHASE.VICTORY].includes(state.phase))return {started:false,reason:"invalid-phase"};
    store.dispatch({type:GAME_ACTION.START_BATTLE,enemy:createEnemy(currentIds()[enemyIndex],{floor})});
    started=true;
    return {started:true,floor,enemyNumber:enemyIndex+1,enemy:store.getState().enemy};
  }
  return {
    start(){
      if(started)return {started:false,reason:"already-started"};
      floor=1;enemyIndex=0;encounterSetVersion=CURRENT_ENCOUNTER_SET_VERSION;
      return startCurrentEnemy();
    },
    advance(){
      if(!started||store.getState().phase!==GAME_PHASE.VICTORY)return {started:false,reason:"battle-not-won"};
      const floorCleared=enemyIndex===currentIds().length-1;
      if(floorCleared&&!rewardClaimed)return {started:false,reason:"reward-not-claimed"};
      if(floorCleared){floor+=1;enemyIndex=0;rewardClaimed=false;encounterSetVersion=CURRENT_ENCOUNTER_SET_VERSION;}
      else enemyIndex+=1;
      return {...startCurrentEnemy(),floorCleared,floor,enemyNumber:enemyIndex+1};
    },
    reset(){floor=1;enemyIndex=0;started=false;rewardClaimed=false;encounterSetVersion=CURRENT_ENCOUNTER_SET_VERSION;},
    claimFloorReward(){
      const progress=this.getProgress();
      if(!progress.floorCleared)return {claimed:false,reason:"floor-not-cleared"};
      if(rewardClaimed)return {claimed:false,reason:"already-claimed"};
      const itemId=floor%2===1?"small-potion":"large-potion",quantity=1,gold=10+floor*5;
      store.dispatch({type:GAME_ACTION.ADD_ITEM,itemId,quantity});
      store.dispatch({type:GAME_ACTION.ADD_GOLD,amount:gold});
      rewardClaimed=true;
      return {claimed:true,floor,itemId,quantity,gold};
    },
    getSaveData(){return {floor,enemyIndex,started,rewardClaimed,encounterSetVersion};},
    isValidSaveData(data,savedGameState=store.getState()){
      if(!data||typeof data!=="object"||Array.isArray(data))return false;
      const version=data.encounterSetVersion??1;
      if(!Number.isSafeInteger(data.floor)||data.floor<1||!Number.isInteger(data.enemyIndex)||
        ![1,CURRENT_ENCOUNTER_SET_VERSION].includes(version)||typeof data.started!=="boolean"||typeof data.rewardClaimed!=="boolean")return false;
      const ids=getEncounterIds(data.floor,version);
      if(data.enemyIndex<0||data.enemyIndex>=ids.length)return false;
      if(!data.started)return data.floor===1&&data.enemyIndex===0&&!data.rewardClaimed&&savedGameState.phase===GAME_PHASE.TITLE;
      if(savedGameState.phase===GAME_PHASE.TITLE||!savedGameState.enemy)return false;
      const expected=createEnemy(ids[data.enemyIndex],{floor:data.floor}),actual=savedGameState.enemy;
      if(actual.id!==expected.id||actual.maxHp!==expected.maxHp||actual.attackPower!==expected.attackPower||
        actual.experienceReward!==expected.experienceReward)return false;
      if(version===CURRENT_ENCOUNTER_SET_VERSION&&(actual.isBoss!==expected.isBoss||
        JSON.stringify(actual.abilities)!==JSON.stringify(expected.abilities)))return false;
      if(data.rewardClaimed&&(data.enemyIndex!==ids.length-1||savedGameState.phase!==GAME_PHASE.VICTORY))return false;
      return true;
    },
    restoreSaveData(data){
      if(!this.isValidSaveData(data))return false;
      floor=data.floor;enemyIndex=data.enemyIndex;started=data.started;rewardClaimed=data.rewardClaimed;
      encounterSetVersion=data.encounterSetVersion??1;
      return true;
    },
    getProgress(){
      return {floor,enemyNumber:enemyIndex+1,enemiesPerFloor:currentIds().length,
        floorCleared:started&&store.getState().phase===GAME_PHASE.VICTORY&&enemyIndex===currentIds().length-1,
        started,rewardClaimed};
    },
  };
}