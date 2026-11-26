import test from "node:test";
import assert from "node:assert/strict";
import { CHARACTERS, DEFAULT_CHARACTER_ID, getCharacterDefinition, isValidCharacterId, normalizeCharacterId } from "./characters.js";
test("4つのキャラクターが最初からすべて選択可能",()=>{
 assert.equal(CHARACTERS.length,4);
 assert.deepEqual(CHARACTERS.map((entry)=>entry.id),["gou-swordsman","regen-knight","shadow-blade","elemental-mage"]);
 for(const character of CHARACTERS){assert.ok(character.name&&character.title&&character.icon);assert.ok(character.description&&character.strength&&character.challenge);}
});
test("キャラクターIDの検証と旧データの初期値補完",()=>{
 assert.equal(isValidCharacterId(DEFAULT_CHARACTER_ID),true);
 assert.equal(isValidCharacterId("unknown"),false);
 assert.equal(normalizeCharacterId("unknown"),DEFAULT_CHARACTER_ID);
 assert.equal(normalizeCharacterId(undefined),DEFAULT_CHARACTER_ID);
 assert.equal(getCharacterDefinition("shadow-blade").name,"影刃");
});
