const NAV_ITEMS = Object.freeze([
  { href: "./index.html", file: "index.html", icon: "🏡", label: "ホーム" },
  { href: "./dungeons.html", file: "dungeons.html", icon: "🗺️", label: "冒険" },
  { href: "./inventory.html", file: "inventory.html", icon: "🎒", label: "アイテム" },
  { href: "./status.html", file: "status.html", icon: "🧑‍🌾", label: "能力" },
]);

const NPC_PAGES = Object.freeze({
  "index.html": { name: "リリア", role: "冒険者ギルド受付", portrait: "./assets/npcs/guild-receptionist.svg", line: "おかえりなさい！今日はどんな冒険に出かけますか？" },
  "dungeons.html": { name: "リリア", role: "冒険者ギルド受付", portrait: "./assets/npcs/guild-receptionist.svg", line: "新しい依頼が届いていますよ。準備ができたら出発しましょう！" },
  "shop.html": { name: "ロウ", role: "道具屋の店主", portrait: "./assets/npcs/merchant.svg", line: "武器も道具も揃ってるよ。必要なものを選んでいってくれ！" },
  "crafting.html": { name: "ガルド", role: "熟練の鍛冶職人", portrait: "./assets/npcs/blacksmith.svg", line: "素材を持ってきたな。よし、腕によりをかけて仕上げてやる！" },
  "inventory.html": { name: "セシル", role: "ギルド倉庫係", portrait: "./assets/npcs/quartermaster.svg", line: "持ち物を整理しましょう。装備の付け替えもここでできますよ。" },
  "status.html": { name: "エルナ", role: "冒険者ギルド教官", portrait: "./assets/npcs/trainer.svg", line: "自分の能力を知ることも、強くなるための大切な一歩よ。" },
  "skills.html": { name: "ノア", role: "魔法研究家", portrait: "./assets/npcs/arcanist.svg", line: "スキルを磨けば、強敵との戦いも有利に進められるぞ。" },
  "settings.html": { name: "リリア", role: "冒険者ギルド受付", portrait: "./assets/npcs/guild-receptionist.svg", line: "操作や演出は、遊びやすいように調整できますよ。" },
  "account.html": { name: "リリア", role: "冒険者ギルド受付", portrait: "./assets/npcs/guild-receptionist.svg", line: "冒険の記録は大切に保管しましょう。セーブの設定はこちらです。" }
});

const MORE_ITEMS = Object.freeze([
  { href: "./settings.html", file: "settings.html", icon: "⚙️", label: "ゲーム設定", note: "操作や演出を調整" },
  { href: "./account.html", file: "account.html", icon: "🔐", label: "アカウント", note: "セーブとログインを管理" },
]);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function pageFile() {
  return window.location.pathname.split("/").filter(Boolean).pop() || "index.html";
}
function navLink(item, current, className) {
  const link = el("a", className);
  link.href = item.href;
  if (item.file === current) link.setAttribute("aria-current", "page");
  link.append(el("span", "wfq-nav-icon", item.icon), el("span", "wfq-nav-label", item.label));
  return link;
}


function createNpcStage(current) {
  const npc = NPC_PAGES[current] ?? NPC_PAGES["index.html"];
  const stage = el("section", "wfq-npc-stage");
  stage.setAttribute("aria-label", npc.name + "の案内");
  const portraitFrame = el("div", "wfq-npc-portrait");
  const portrait = document.createElement("img");
  portrait.src = npc.portrait;
  portrait.alt = npc.name;
  portrait.loading = "eager";
  portrait.decoding = "async";
  portraitFrame.append(portrait);
  const dialogue = el("div", "wfq-npc-dialogue");
  const identity = el("div", "wfq-npc-identity");
  identity.append(el("strong", "wfq-npc-name", npc.name), el("span", "wfq-npc-role", npc.role));
  dialogue.append(identity, el("p", "wfq-npc-line", "「" + npc.line + "」"));
  stage.append(portraitFrame, dialogue);
  return stage;
}

function setupSharedLayout() {
  const main = document.querySelector("main");
  if (!main || document.querySelector(".wfq-app-shell")) return;

  const current = pageFile();
  const moreActive = MORE_ITEMS.some(item => item.file === current);
  const pageTitle = document.title.split("|")[1]?.trim() || "冒険者の拠点";
  document.body.dataset.wfqPage = current;


  const shell = el("div", "wfq-app-shell");
  const sidebar = el("aside", "wfq-sidebar");
  const brand = el("a", "wfq-brand");
  brand.href = "./index.html";
  brand.append(el("span", "wfq-brand-mark", "🌿"));
  const brandText = el("span", "wfq-brand-copy");
  brandText.append(el("strong", "", "WORD FALL QUEST"), el("small", "", "ADVENTURER'S HUB"));
  brand.append(brandText);
  sidebar.append(brand, el("div", "wfq-current-label", pageTitle), el("div", "wfq-nav-caption", "メインメニュー"));

  const sideNav = el("nav", "wfq-side-nav");
  sideNav.setAttribute("aria-label", "メインメニュー");
  for (const item of NAV_ITEMS) sideNav.append(navLink(item, current, "wfq-nav-link"));
  sidebar.append(sideNav, el("div", "wfq-nav-caption wfq-facility-caption", "施設メニュー"));

  const moreSide = el("button", "wfq-more-trigger", "☷　その他の施設");
  moreSide.type = "button";
  moreSide.setAttribute("aria-expanded", "false");
  moreSide.setAttribute("aria-controls", "wfqFacilityDrawer");
  if (moreActive) moreSide.classList.add("is-active");
  sidebar.append(moreSide, el("div", "wfq-sidebar-spacer"), el("div", "wfq-sidebar-footer", "冒険の準備を整えよう！"));

  const content = el("div", "wfq-content");
  content.append(createNpcStage(current), main);
  shell.append(sidebar, content);
  document.body.insertBefore(shell, document.body.firstChild);

  const mobileNav = el("nav", "wfq-mobile-nav");
  mobileNav.setAttribute("aria-label", "メインメニュー");
  for (const item of NAV_ITEMS) mobileNav.append(navLink(item, current, "wfq-mobile-link"));
  const moreMobile = el("button", "wfq-mobile-more");
  moreMobile.type = "button";
  moreMobile.setAttribute("aria-label", "その他の施設を開く");
  moreMobile.setAttribute("aria-expanded", "false");
  moreMobile.setAttribute("aria-controls", "wfqFacilityDrawer");
  moreMobile.append(el("span", "wfq-mobile-icon", "☷"), el("span", "wfq-mobile-label", "その他"));
  if (moreActive) moreMobile.classList.add("is-active");
  mobileNav.append(moreMobile);
  document.body.append(mobileNav);

  const layer = el("div", "wfq-drawer-layer");
  layer.hidden = true;
  const backdrop = el("button", "wfq-drawer-backdrop");
  backdrop.type = "button";
  backdrop.setAttribute("aria-label", "施設メニューを閉じる");
  layer.append(backdrop);

  const drawer = el("section", "wfq-drawer");
  drawer.id = "wfqFacilityDrawer";
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "true");
  drawer.setAttribute("aria-labelledby", "wfqDrawerTitle");
  const header = el("div", "wfq-drawer-head");
  const title = el("h2", "wfq-drawer-title", "街の施設");
  title.id = "wfqDrawerTitle";
  const close = el("button", "wfq-drawer-close", "×");
  close.type = "button";
  close.setAttribute("aria-label", "閉じる");
  header.append(title, close);
  drawer.append(header, el("p", "wfq-drawer-description", "行きたい施設を選んでね。"));

  const drawerNav = el("nav", "wfq-drawer-grid");
  drawerNav.setAttribute("aria-label", "街の施設");
  for (const item of MORE_ITEMS) {
    const link = el("a", "wfq-drawer-link");
    link.href = item.href;
    if (item.file === current) link.setAttribute("aria-current", "page");
    link.append(el("span", "wfq-drawer-icon", item.icon));
    const copy = el("span", "wfq-drawer-copy");
    copy.append(el("strong", "", item.label), el("small", "", item.note));
    link.append(copy);
    drawerNav.append(link);
  }
  drawer.append(drawerNav);
  layer.append(drawer);
  document.body.append(layer);

  let isOpen = false;
  const setOpen = open => {
    isOpen = Boolean(open);
    layer.hidden = !isOpen;
    document.body.classList.toggle("wfq-drawer-open", isOpen);
    moreSide.setAttribute("aria-expanded", String(isOpen));
    moreMobile.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) close.focus();
  };
  const toggle = () => setOpen(!isOpen);
  moreSide.addEventListener("click", toggle);
  moreMobile.addEventListener("click", toggle);
  backdrop.addEventListener("click", () => setOpen(false));
  close.addEventListener("click", () => setOpen(false));
  drawerNav.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && isOpen) {
      setOpen(false);
      moreSide.focus();
    }
  });

  // The shared navigation replaces old "back to home" links on normal pages.
  for (const link of main.querySelectorAll(".topline .back, .topline .back-link, main > .back")) {
    link.hidden = true;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupSharedLayout, { once: true });
} else {
  setupSharedLayout();
}
