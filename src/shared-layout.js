import { getReceptionistAdvice } from "./receptionist-advisor.js";
import { getBlacksmithAdvice } from "./blacksmith-advisor.js";
import { getMerchantAdvice } from "./merchant-advisor.js";

const NAV_ITEMS = Object.freeze([
  { href: "./index.html", file: "index.html", icon: "🏡", label: "ホーム" },
  { href: "./dungeons.html", file: "dungeons.html", icon: "🗺️", label: "冒険" },
  { href: "./inventory.html", file: "inventory.html", icon: "🎒", label: "アイテム" },
  { href: "./status.html", file: "status.html", icon: "🧑‍🌾", label: "能力" },
]);

const NPC_PAGES = Object.freeze({
  "index.html": {
    name: "リリア", role: "冒険者ギルド受付", portrait: "./assets/npcs/guild-receptionist.webp",
    line: "おかえりなさい！今日はどんな冒険に出かけますか？",
    lines: ["おかえりなさい！今日はどんな冒険に出かけますか？", "森の奥では、見慣れない魔物が目撃されています。準備は念入りに！", "装備やスキルの確認も忘れずに。今日の冒険も応援しています！"]
  },
  "dungeons.html": {
    name: "リリア", role: "冒険者ギルド受付", portrait: "./assets/npcs/guild-receptionist.webp",
    line: "新しい依頼が届いていますよ。準備ができたら出発しましょう！",
    lines: ["新しい依頼が届いていますよ。準備ができたら出発しましょう！", "ダンジョンごとに現れる魔物も手に入る素材も違います。", "無理は禁物です。帰ってきたら報酬を確認しましょうね！"]
  },
  "shop.html": {
    name: "ロウ", role: "道具屋の店主", portrait: "./assets/npcs/merchant.webp",
    line: "武器も道具も揃ってるよ。必要なものを選んでいってくれ！",
    lines: ["武器も道具も揃ってるよ。必要なものを選んでいってくれ！", "回復アイテムは冒険の前に用意しておくと安心だ。", "素材を売ってゴールドにするのも忘れずにな！"]
  },
  "crafting.html": {
    name: "ガルド", role: "熟練の鍛冶職人", portrait: "./assets/npcs/blacksmith.webp",
    line: "素材を持ってきたな。よし、腕によりをかけて仕上げてやる！",
    lines: ["素材を持ってきたな。よし、腕によりをかけて仕上げてやる！", "強い装備を作るには、ダンジョンで珍しい素材を集めるんだ。", "作成した装備はアイテム欄から確認できるぞ！"]
  },
  "inventory.html": {
    name: "セシル", role: "ギルド倉庫係", portrait: "./assets/npcs/quartermaster.svg",
    line: "持ち物を整理しましょう。装備の付け替えもここでできますよ。",
    lines: ["持ち物を整理しましょう。装備の付け替えもここでできますよ。", "新しい装備を手に入れたら、今の装備と能力を比べてみましょう。", "素材はショップで売却できます。持ち物をすっきりさせましょう！"]
  },
  "status.html": {
    name: "エルナ", role: "冒険者ギルド教官", portrait: "./assets/npcs/trainer.svg",
    line: "自分の能力を知ることも、強くなるための大切な一歩よ。",
    lines: ["自分の能力を知ることも、強くなるための大切な一歩よ。", "装備やスキルの組み合わせで、戦い方も変わってくるわ。", "次の冒険に向けて、自分の成長を確かめていきましょう！"]
  },
  "skills.html": {
    name: "ノア", role: "魔法研究家", portrait: "./assets/npcs/arcanist.svg",
    line: "スキルを磨けば、強敵との戦いも有利に進められるぞ。",
    lines: ["スキルを磨けば、強敵との戦いも有利に進められるぞ。", "攻撃スキルは威力だけでなく、使いやすさも考えて選ぶんだ。", "育てたスキルを装備して、次の冒険で試してみよう！"]
  },
  "settings.html": {
    name: "リリア", role: "冒険者ギルド受付", portrait: "./assets/npcs/guild-receptionist.webp",
    line: "操作や演出は、遊びやすいように調整できますよ。",
    lines: ["操作や演出は、遊びやすいように調整できますよ。", "画面の光り方などは、ゲーム設定から変えられます。", "自分に合った設定で、ゆっくり冒険を楽しんでくださいね！"]
  },
  "account.html": {
    name: "リリア", role: "冒険者ギルド受付", portrait: "./assets/npcs/guild-receptionist.webp",
    line: "冒険の記録は大切に保管しましょう。セーブの設定はこちらです。",
    lines: ["冒険の記録は大切に保管しましょう。セーブの設定はこちらです。", "アカウントを連携すると、冒険の記録を引き継ぎやすくなります。", "困ったときは、ここでセーブの状態を確認してくださいね。"]
  }
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
  const homeAdvice = current === "index.html"
    ? getReceptionistAdvice(window.WFQ_HOME_CONTEXT ?? {})
    : null;
  const blacksmithAdvice = current === "crafting.html"
    ? getBlacksmithAdvice(window.WFQ_BLACKSMITH_CONTEXT ?? {})
    : null;
  const merchantAdvice = current === "shop.html"
    ? getMerchantAdvice(window.WFQ_MERCHANT_CONTEXT ?? {})
    : null;
  const dynamicAdvice = homeAdvice ?? blacksmithAdvice ?? merchantAdvice;
  const lines = dynamicAdvice
    ? [dynamicAdvice.greeting, ...(npc.lines ?? []).slice(1)]
    : (Array.isArray(npc.lines) && npc.lines.length ? npc.lines : [npc.line]);
  const stage = el("section", "wfq-npc-stage");
  if (npc.portrait.endsWith("guild-receptionist.webp")) stage.classList.add("wfq-npc-stage--reception");
  if (homeAdvice) stage.classList.add("wfq-npc-stage--home");
  if (blacksmithAdvice) stage.classList.add("wfq-npc-stage--blacksmith");
  if (current === "shop.html") stage.classList.add("wfq-npc-stage--merchant");
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
  const line = el("p", "wfq-npc-line", "「" + lines[0] + "」");
  line.setAttribute("aria-live", "polite");
  const nextButton = el("button", "wfq-npc-next", "つぎの話　›");
  nextButton.type = "button";
  nextButton.setAttribute("aria-label", npc.name + "の会話を進める");
  let lineIndex = 0;
  nextButton.addEventListener("click", () => {
    lineIndex = (lineIndex + 1) % lines.length;
    line.textContent = "「" + lines[lineIndex] + "」";
    stage.classList.remove("is-talking");
    void line.offsetWidth;
    stage.classList.add("is-talking");
  });
  dialogue.append(identity, line, nextButton);
  stage.append(portraitFrame, dialogue);

  const createAdviceCard = (advice, isBlacksmith) => {
    const card = el("aside", "wfq-npc-advice");
    card.setAttribute("aria-label", isBlacksmith ? "ガルドの鍛冶アドバイス" : "リリアのおすすめ冒険先");
    const copy = el("div", "wfq-npc-advice-copy");
    copy.append(
      el("span", "wfq-npc-advice-label",
        isBlacksmith
          ? advice.status === "ready" ? "今すぐ作成できる装備" : "次に作るおすすめ装備"
          : "本日のおすすめ"
      ),
      el("strong", "wfq-npc-advice-title",
        isBlacksmith ? "⚒️ " + advice.itemName : advice.dungeonIcon + " " + advice.dungeonName
      ),
      el("p", "wfq-npc-advice-detail", advice.detail),
      el("span", "wfq-npc-advice-meta", advice.meta)
    );
    const link = el("a", "wfq-npc-advice-link",
      isBlacksmith ? "レシピを見る　›" : "冒険先を見る　›"
    );
    link.href = isBlacksmith ? "#facilityContent" : "./dungeons.html";
    card.append(copy, link);
    return card;
  };

  if (homeAdvice) stage.append(createAdviceCard(homeAdvice, false));
  if (blacksmithAdvice) {
    const card = createAdviceCard(blacksmithAdvice, true);
    stage.append(card);
    window.addEventListener("wfq:blacksmith-context-updated", () => {
      const updated = getBlacksmithAdvice(window.WFQ_BLACKSMITH_CONTEXT ?? {});
      if (lineIndex === 0) line.textContent = "「" + updated.greeting + "」";
      card.replaceWith(createAdviceCard(updated, true));
    });
  }
  if (merchantAdvice) {
    const createMerchantCard = (advice) => {
      const card = el("aside", "wfq-npc-advice wfq-npc-advice--merchant");
      card.setAttribute("aria-label", "ロウのおすすめ商品と売却案内");
      const copy = el("div", "wfq-npc-advice-copy");
      copy.append(
        el("span", "wfq-npc-advice-label", advice.label),
        el("strong", "wfq-npc-advice-title", "🛒 " + advice.itemName),
        el("p", "wfq-npc-advice-detail", advice.detail),
        el("span", "wfq-npc-advice-meta", advice.meta)
      );
      if (advice.sellableSummary) {
        copy.append(el("p", "wfq-npc-advice-sell", advice.sellableSummary));
      }
      const actions = el("div", "wfq-npc-advice-actions");
      const link = el("a", "wfq-npc-advice-link", advice.actionLabel);
      link.href = advice.actionHref;
      actions.append(link);
      if (advice.hasSellableMaterials) {
        const sellLink = el("a", "wfq-npc-advice-sell-link", "素材を売却する　›");
        sellLink.href = "./inventory.html";
        actions.append(sellLink);
      }
      card.append(copy, actions);
      return card;
    };
    const card = createMerchantCard(merchantAdvice);
    stage.append(card);
    window.addEventListener("wfq:merchant-context-updated", () => {
      const updated = getMerchantAdvice(window.WFQ_MERCHANT_CONTEXT ?? {});
      if (lineIndex === 0) line.textContent = "「" + updated.greeting + "」";
      card.replaceWith(createMerchantCard(updated));
    });
  }
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
