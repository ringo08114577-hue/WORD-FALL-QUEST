/**
 * Shared image catalog for every visible character in WORD FALL QUEST.
 * Use null for characters whose dedicated artwork has not been registered yet.
 */
export const DEFAULT_CHARACTER_IMAGE = "assets/characters/placeholder.svg";

export const CHARACTER_IMAGE_CATALOG = Object.freeze({
  hero: Object.freeze({ image: null }),
  slime: Object.freeze({ image: "assets/enemies/green-slime.webp" }),
  "orange-slime": Object.freeze({ image: "assets/enemies/orange-slime.webp" }),
  bat: Object.freeze({ image: "assets/enemies/ghost-bat.webp" }),
  goblin: Object.freeze({ image: null }),
  orc: Object.freeze({ image: "assets/enemies/orc.webp" }),
  "moss-golem": Object.freeze({ image: null }),
  "forest-dragon": Object.freeze({ image: null }),
  "ice-wolf": Object.freeze({ image: null }),
  "ice-golem": Object.freeze({ image: null }),
  "ice-dragon": Object.freeze({ image: null }),
});

export function getCharacterImagePath(characterId) {
  const definition = typeof characterId === "string" &&
    Object.hasOwn(CHARACTER_IMAGE_CATALOG, characterId)
    ? CHARACTER_IMAGE_CATALOG[characterId]
    : null;
  return definition?.image || DEFAULT_CHARACTER_IMAGE;
}

export function setCharacterImage(element, characterId, { alt = "", baseUrl } = {}) {
  if (!element || typeof element !== "object" || !element.dataset) {
    throw new TypeError("画像要素を指定してください。");
  }
  if (typeof baseUrl !== "string" || !baseUrl) {
    throw new TypeError("画像の基準URLを指定してください。");
  }

  const imagePath = getCharacterImagePath(characterId);
  element.alt = alt;
  if (
    element.dataset.characterId === String(characterId) &&
    element.dataset.characterImagePath === imagePath
  ) {
    return imagePath;
  }

  const resolve = (path) => new URL(path.replace(/^\/+/, ""), baseUrl).href;
  element.dataset.characterId = String(characterId);
  element.dataset.characterImagePath = imagePath;
  element.dataset.characterUsingPlaceholder = String(imagePath === DEFAULT_CHARACTER_IMAGE);
  element.dataset.characterImageFailed = "false";
  element.hidden = true;

  element.onload = () => {
    element.hidden = false;
  };
  element.onerror = () => {
    if (element.dataset.characterUsingPlaceholder === "true") {
      element.hidden = true;
      element.dataset.characterImageFailed = "true";
      return;
    }
    element.dataset.characterUsingPlaceholder = "true";
    element.src = resolve(DEFAULT_CHARACTER_IMAGE);
  };

  element.src = resolve(imagePath);
  return imagePath;
}

export function clearCharacterImage(element) {
  if (!element || typeof element !== "object" || !element.dataset) {
    throw new TypeError("画像要素を指定してください。");
  }
  element.hidden = true;
  element.alt = "";
  element.onload = null;
  element.onerror = null;
  element.removeAttribute?.("src");
  if (!element.removeAttribute) element.src = "";
  delete element.dataset.characterId;
  delete element.dataset.characterImagePath;
  delete element.dataset.characterUsingPlaceholder;
  delete element.dataset.characterImageFailed;
}
