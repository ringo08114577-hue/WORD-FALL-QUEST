/** Character-owned skill catalog. Add a skill by assigning its characterId. */
const UPGRADE_COSTS = Object.freeze([50, 100, 200, 400]);
const LEVELS = (values) => Object.freeze(values);

function defineSkill(id, name, characterId, description, options = {}) {
  return Object.freeze({
    id,
    name,
    evolvedName: name + "・改",
    characterId,
    category: options.category ?? "attack",
    initiallyEquipped: options.initiallyEquipped === true,
    passive: options.passive === true,
    description,
    minWordLength: options.minWordLength ?? 3,
    maxWordLength: options.maxWordLength ?? 4,
    damageMultiplier: options.damageMultiplier ?? 1,
    effect: options.effect ? Object.freeze(options.effect) : undefined,
    startingLevel: 1,
    maxLevel: 5,
    upgradeCosts: UPGRADE_COSTS,
  });
}

const GOU = "gou-swordsman";
const OTHER = Object.freeze({
  regen: "regen-knight",
  shadow: "shadow-blade",
  elemental: "elemental-mage",
});

export const SKILL_DEFINITIONS = Object.freeze({
  // 轟剣士：蓄積・攻撃・消費・補助・パッシブをすべて用意。
  "gou-focus": defineSkill("gou-focus", "闘気集中", GOU,
    "攻撃せずに集中し、轟気を大量に蓄える基本技。", {
      category: "support", initiallyEquipped: true, minWordLength: 3, maxWordLength: 4,
      effect: { type: "gouki-charge", amountByLevel: LEVELS([10, 12, 14, 17, 20]) },
    }),
  "gou-limit-focus": defineSkill("gou-limit-focus", "極限集中", GOU,
    "攻撃を捨てて、闘気集中よりさらに多くの轟気を蓄える。", {
      category: "support", minWordLength: 7, maxWordLength: 7,
      effect: { type: "gouki-charge", amountByLevel: LEVELS([20, 24, 28, 34, 40]) },
    }),
  "gou-unyielding": defineSkill("gou-unyielding", "不屈の闘志", GOU,
    "HPが減っているほど多くの轟気を獲得する。", {
      category: "support", minWordLength: 5, maxWordLength: 6,
      effect: {
        type: "gouki-low-hp-charge",
        baseAmountByLevel: LEVELS([2, 3, 4, 5, 6]),
        missingHpBonusByLevel: LEVELS([8, 9, 10, 12, 14]),
      },
    }),
  "gou-advance-cut": defineSkill("gou-advance-cut", "轟進斬", GOU,
    "攻撃しながら轟気を蓄える、使いやすい攻防一体の技。", {
      category: "attack", initiallyEquipped: true, minWordLength: 3, maxWordLength: 4,
      effect: {
        type: "gouki-attack",
        damageMultiplierByLevel: LEVELS([0.8, 0.9, 1, 1.1, 1.2]),
        gainAmountByLevel: LEVELS([4, 5, 6, 7, 9]),
      },
    }),
  "gou-heavy-charge": defineSkill("gou-heavy-charge", "剛撃", GOU,
    "重い一撃を叩き込みながら轟気を少し蓄える。", {
      category: "attack", minWordLength: 5, maxWordLength: 6,
      effect: {
        type: "gouki-attack",
        damageMultiplierByLevel: LEVELS([1.4, 1.6, 1.8, 2, 2.3]),
        gainAmountByLevel: LEVELS([2, 3, 3, 4, 5]),
      },
    }),
  "gou-slash": defineSkill("gou-slash", "基本斬撃", GOU,
    "轟気を消費せずに攻撃する、安定した基本技。", {
      category: "attack", initiallyEquipped: true, minWordLength: 3, maxWordLength: 4,
      damageMultiplier: 1,
    }),
  "gou-heavy-blow": defineSkill("gou-heavy-blow", "重撃", GOU,
    "轟気を温存したまま大きなダメージを与える。", {
      category: "attack", minWordLength: 5, maxWordLength: 6,
      damageMultiplier: 2,
    }),
  "gou-roaring-blade": defineSkill("gou-roaring-blade", "轟刃", GOU,
    "轟気を3個消費して攻撃する。少ない消費でこまめに火力を出す。", {
      category: "attack", initiallyEquipped: true, minWordLength: 5, maxWordLength: 6,
      effect: {
        type: "gouki-consume-attack", consumeAmount: 3,
        bonusPerStackByLevel: LEVELS([0.2, 0.24, 0.28, 0.32, 0.4]),
      },
    }),
  "gou-break-army": defineSkill("gou-break-army", "破軍斬", GOU,
    "轟気を10個消費する強撃。ボスの防御ギミックを破壊できる。", {
      category: "attack", minWordLength: 7, maxWordLength: 8,
      effect: {
        type: "gouki-consume-attack", consumeAmount: 10, breakGuard: true,
        bonusPerStackByLevel: LEVELS([0.25, 0.28, 0.32, 0.36, 0.4]),
      },
    }),
  "gou-collapse": defineSkill("gou-collapse", "崩壊撃", GOU,
    "轟気を20個消費。強固なボスの防御を打ち砕く大技。", {
      category: "attack", minWordLength: 8, maxWordLength: 10,
      effect: {
        type: "gouki-consume-attack", consumeAmount: 20, breakGuard: true,
        bonusPerStackByLevel: LEVELS([0.3, 0.34, 0.38, 0.42, 0.5]),
      },
    }),
  "gou-overlord": defineSkill("gou-overlord", "覇王斬", GOU,
    "轟気を50個消費して放つ、規格外の一撃。", {
      category: "attack", minWordLength: 9, maxWordLength: 14,
      effect: {
        type: "gouki-consume-attack", consumeAmount: 50, breakGuard: true,
        bonusPerStackByLevel: LEVELS([0.35, 0.38, 0.42, 0.46, 0.5]),
      },
    }),
  "gou-heaven-one-flash": defineSkill("gou-heaven-one-flash", "天轟一閃", GOU,
    "所持する轟気をすべて消費。蓄積数に比例して威力が爆発的に上昇する究極技。", {
      category: "attack", minWordLength: 9, maxWordLength: 14,
      effect: {
        type: "gouki-consume-all", breakGuard: true,
        bonusPerStackByLevel: LEVELS([0.4, 0.45, 0.5, 0.55, 0.6]),
      },
    }),
  "gou-ki-convert": defineSkill("gou-ki-convert", "轟気変換", GOU,
    "轟気を5個消費して防御力に変換し、敵の攻撃を耐える。", {
      category: "support", minWordLength: 5, maxWordLength: 6,
      effect: {
        type: "gouki-defense", consumeAmount: 5, hits: 2,
        bonusByLevel: LEVELS([35, 45, 55, 70, 85]),
      },
    }),
  "gou-limit-break": defineSkill("gou-limit-break", "限界突破", GOU,
    "次に轟気を獲得する技の獲得量を大幅に増やす。", {
      category: "support", minWordLength: 5, maxWordLength: 6,
      effect: {
        type: "gouki-limit-break",
        multiplierByLevel: LEVELS([2, 2.2, 2.5, 2.75, 3]),
      },
    }),
  "gou-destruction": defineSkill("gou-destruction", "破壊の極意", GOU,
    "パッシブ。轟気20個以上でボスの防御ギミックを破壊し、守りを無視する。", {
      category: "passive", passive: true, minWordLength: 3, maxWordLength: 4,
      effect: {
        type: "gouki-passive-breaker",
        threshold: 20,
        damageMultiplierByLevel: LEVELS([1, 1.05, 1.1, 1.15, 1.2]),
      },
    }),
  "gou-resonance": defineSkill("gou-resonance", "轟気共鳴", GOU,
    "パッシブ。轟気30個以上で攻撃力上昇、50個以上でさらに強化される。", {
      category: "passive", passive: true, minWordLength: 3, maxWordLength: 4,
      effect: {
        type: "gouki-passive-resonance",
        thresholdByLevel: LEVELS([30, 30, 28, 26, 25]),
        multiplierByLevel: LEVELS([1.2, 1.25, 1.3, 1.4, 1.5]),
        highMultiplierByLevel: LEVELS([1.5, 1.6, 1.7, 1.8, 2]),
        highThreshold: 50,
      },
    }),
  // 再生騎士：ドレイン・回復・オーバーHP蓄積を軸にした耐久型。
  "regen-drain-slash": defineSkill("regen-drain-slash", "吸命斬", OTHER.regen,
    "攻撃で与えたダメージの85%以上を吸収。HPが満タンなら、あふれた回復分がオーバーHPになる。", {
      category: "attack", initiallyEquipped: true, minWordLength: 3, maxWordLength: 4,
      effect: {
        type: "regen-drain-attack",
        damageMultiplierByLevel: LEVELS([0.9, 0.95, 1, 1.05, 1.1]),
        drainRatioByLevel: LEVELS([0.85, 0.9, 0.95, 1.0, 1.05]),
      },
    }),
  "regen-life-breaker": defineSkill("regen-life-breaker", "生命断ち", OTHER.regen,
    "蓄えたオーバーHPが多いほど威力が上昇する。再生騎士の主力攻撃。", {
      category: "attack", initiallyEquipped: true, minWordLength: 5, maxWordLength: 6,
      effect: {
        type: "regen-overhp-attack",
        damageMultiplierByLevel: LEVELS([1.05, 1.1, 1.15, 1.25, 1.35]),
        bonusAtFullOverHpByLevel: LEVELS([0.35, 0.45, 0.55, 0.65, 0.8]),
      },
    }),
  "regen-prayer": defineSkill("regen-prayer", "再生の祈り", OTHER.regen,
    "自身のHPを大きく回復する。ピンチから立て直す基本回復技。", {
      category: "heal", initiallyEquipped: true, minWordLength: 5, maxWordLength: 6,
      effect: {
        type: "heal",
        amountByLevel: LEVELS([30, 35, 40, 45, 50]),
        hpRatioByLevel: LEVELS([0.3, 0.35, 0.4, 0.45, 0.5]),
      },
    }),
  "regen-aegis": defineSkill("regen-aegis", "再生装甲", OTHER.regen,
    "再生力を防御に変換し、敵の攻撃を複数回軽減する。", {
      category: "defense", initiallyEquipped: true, minWordLength: 5, maxWordLength: 6,
      effect: { type: "defense", bonusByLevel: LEVELS([25, 30, 35, 42, 50]), hits: 2 },
    }),
  "regen-holy-drain": defineSkill("regen-holy-drain", "聖血の一撃", OTHER.regen,
    "重い一撃と同時に大量のHPを吸収する上位ドレイン技。", {
      category: "attack", minWordLength: 7, maxWordLength: 8,
      effect: {
        type: "regen-drain-attack",
        damageMultiplierByLevel: LEVELS([1.3, 1.4, 1.5, 1.65, 1.8]),
        drainRatioByLevel: LEVELS([0.95, 1.0, 1.05, 1.1, 1.15]),
      },
    }),
  "regen-overflow": defineSkill("regen-overflow", "生命蓄積", OTHER.regen,
    "攻撃せずにオーバーHPを直接蓄える。強力な一撃を放つ前の準備に使う。", {
      category: "support", minWordLength: 5, maxWordLength: 6,
      effect: { type: "regen-overhp-gain", amountByLevel: LEVELS([25, 30, 35, 42, 50]) },
    }),
  "regen-immortal-strike": defineSkill("regen-immortal-strike", "不滅崩し", OTHER.regen,
    "オーバーHPを力に変えて放つ大技。蓄積量が多いほど大幅に威力が上がる。", {
      category: "attack", minWordLength: 8, maxWordLength: 10,
      effect: {
        type: "regen-overhp-attack",
        damageMultiplierByLevel: LEVELS([1.35, 1.5, 1.65, 1.8, 2]),
        bonusAtFullOverHpByLevel: LEVELS([0.5, 0.6, 0.7, 0.85, 1]),
      },
    }),
  "regen-eternal-vessel": defineSkill("regen-eternal-vessel", "不滅の器", OTHER.regen,
    "パッシブ。オーバーHPの最大蓄積量を増やす。Lv.1で最大HPの1.5倍、Lv.5で2倍まで蓄積可能。", {
      category: "passive", passive: true, initiallyEquipped: true,
      effect: { type: "regen-overhp-cap", capMultiplierByLevel: LEVELS([1.5, 1.625, 1.75, 1.875, 2.0]) },
    }),
  "regen-vampiric-will": defineSkill("regen-vampiric-will", "吸命の極意", OTHER.regen,
    "パッシブ。ドレイン攻撃のHP吸収率を上げ、オーバーHPを蓄えやすくする。", {
      category: "passive", passive: true,
      effect: { type: "regen-drain-boost", drainRatioBonusByLevel: LEVELS([0.05, 0.08, 0.1, 0.13, 0.16]) },
    }),
  // Other characters keep their temporary skills until their own systems are built.
  "shadow-basic": defineSkill("shadow-basic", "う", OTHER.shadow, "影刃の仮スキル。固有技を追加するための初期枠。", { initiallyEquipped: true }),
  "shadow-basic": defineSkill("shadow-basic", "う", OTHER.shadow, "影刃の仮スキル。固有技を追加するための初期枠。", { initiallyEquipped: true }),
  "elemental-basic": defineSkill("elemental-basic", "え", OTHER.elemental, "元素術師の仮スキル。固有技を追加するための初期枠。", { initiallyEquipped: true }),
});
