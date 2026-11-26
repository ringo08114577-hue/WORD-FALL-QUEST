import { createAppSession } from "./app-session.js";
import { CHARACTERS } from "./characters.js";
const $=(id)=>document.getElementById(id);
const session=createAppSession();
let selectedId=session.getSelectedCharacterId();
const isInTown=session.store.getState().phase==="title";
function updateCurrentCharacter(){
 const character=CHARACTERS.find((entry)=>entry.id===selectedId)||CHARACTERS[0];
 $("currentCharacterIcon").textContent=character.icon;
 $("currentCharacterIcon").style.background="linear-gradient(145deg,"+character.accent+"55,#26343a)";
 $("currentCharacterName").textContent=character.name+" / "+character.title;
 $("currentCharacterDescription").textContent=character.description;
}
function createCharacterCard(character){
 const selected=character.id===selectedId;
 const card=document.createElement("article");
 card.className="character-card"+(selected?" is-selected":"");
 card.style.setProperty("--character-accent",character.accent);
 const art=document.createElement("div");art.className="character-art";art.setAttribute("aria-hidden","true");
 const icon=document.createElement("span");icon.textContent=character.icon;art.append(icon);
 const body=document.createElement("div");body.className="character-card-body";
 const title=document.createElement("span");title.className="character-title";title.textContent=character.title;
 const name=document.createElement("h2");name.textContent=character.name;
 const description=document.createElement("p");description.className="character-description";description.textContent=character.description;
 const details=document.createElement("div");details.className="character-detail";
 const strength=document.createElement("p");strength.textContent="得意：";const strengthLabel=document.createElement("strong");strengthLabel.textContent=character.strength;strength.append(strengthLabel);
 const challenge=document.createElement("p");challenge.textContent="特徴：";const challengeLabel=document.createElement("strong");challengeLabel.textContent=character.challenge;challenge.append(challengeLabel);
 details.append(strength,challenge);
 const button=document.createElement("button");button.type="button";button.className="character-select";button.textContent=selected?"選択中":"このキャラを選ぶ";button.disabled=selected||!isInTown;button.setAttribute("aria-pressed",String(selected));
 button.addEventListener("click",()=>{
  const result=session.selectCharacter(character.id);
  if(!result.selected){$("characterStatus").textContent=result.reason==="not-in-town"?"町に戻ってからキャラクターを変更できるよ。":"キャラクターを選択できませんでした。";return;}
  selectedId=character.id;updateCurrentCharacter();renderCharacters();
  $("characterStatus").textContent=result.saved===false?character.name+"に切り替えました。セーブに失敗したので、もう一度保存を試してね。":character.name+"に切り替えました。選択内容を保存したよ。";
 });
 body.append(title,name,description,details,button);card.append(art,body);return card;
}
function renderCharacters(){$("characterGrid").replaceChildren(...CHARACTERS.map(createCharacterCard));}
updateCurrentCharacter();renderCharacters();
$("characterStatus").textContent=isInTown?"4キャラクターはすべて解放済み。いつでも自由に切り替えられるよ。":"冒険中は変更できないよ。町に戻ってから選択してね。";
window.addEventListener("pagehide",()=>session.save());
