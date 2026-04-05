
const STORAGE_KEY = 'pavankhind_achievements';

export interface Achievement {
  id: string;
  name: string;
  nameMr: string;
  desc: string;
  descMr: string;
  check: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  totalKills: number;
  totalRuns: number;
  runScore: number;
  runMaxCombo: number;
  runDamageTaken: number;
  runValorStrikes: number;
  runObjectives: number;
  runWon: boolean;
  modesCompleted: string[];
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_blood',
    name: 'First Blood',
    nameMr: 'पहिला घाव',
    desc: 'Slay your first enemy.',
    descMr: 'पहिला शत्रू मारा.',
    check: (ctx) => ctx.totalKills >= 1,
  },
  {
    id: 'mavla',
    name: 'Mavla',
    nameMr: 'मावळा',
    desc: 'Slay 10 enemies in a single run.',
    descMr: 'एका लढाईत १० शत्रू मारा.',
    check: (ctx) => ctx.runScore >= 10,
  },
  {
    id: 'sardars_fury',
    name: "Sardar's Fury",
    nameMr: 'सरदाराचा प्रकोप',
    desc: 'Reach a 10-hit combo.',
    descMr: '१० कॉम्बो गाठा.',
    check: (ctx) => ctx.runMaxCombo >= 10,
  },
  {
    id: 'untouchable',
    name: 'Untouchable',
    nameMr: 'अभेद्य',
    desc: 'Complete a run taking less than 10 damage.',
    descMr: '१० पेक्षा कमी नुकसानात लढाई पूर्ण करा.',
    check: (ctx) => ctx.runWon && ctx.runDamageTaken < 10,
  },
  {
    id: 'wall_of_steel',
    name: 'Wall of Steel',
    nameMr: 'पोलादाची भिंत',
    desc: 'Win a run with less than 40 damage taken.',
    descMr: '४० पेक्षा कमी नुकसानात विजय मिळवा.',
    check: (ctx) => ctx.runWon && ctx.runDamageTaken < 40,
  },
  {
    id: 'valor_strike',
    name: 'Valor Incarnate',
    nameMr: 'पराक्रम अवतार',
    desc: 'Use a Valor Strike for the first time.',
    descMr: 'पहिला पराक्रम प्रहार करा.',
    check: (ctx) => ctx.runValorStrikes >= 1,
  },
  {
    id: 'triple_valor',
    name: 'Thrice Blessed',
    nameMr: 'तिहेरी आशीर्वाद',
    desc: 'Use 3 Valor Strikes in one run.',
    descMr: 'एका लढाईत ३ पराक्रम प्रहार करा.',
    check: (ctx) => ctx.runValorStrikes >= 3,
  },
  {
    id: 'objective_master',
    name: 'Banner Holder',
    nameMr: 'ध्वजधारी',
    desc: 'Complete 3 objectives in a single run.',
    descMr: 'एका लढाईत ३ उद्दिष्टे पूर्ण करा.',
    check: (ctx) => ctx.runObjectives >= 3,
  },
  {
    id: 'skirmish_victor',
    name: 'Skirmish Victor',
    nameMr: 'चकमक विजेता',
    desc: 'Win a Skirmish.',
    descMr: 'चकमक जिंका.',
    check: (ctx) => ctx.runWon && ctx.modesCompleted.includes('skirmish'),
  },
  {
    id: 'battle_victor',
    name: 'Battle Victor',
    nameMr: 'लढाई विजेता',
    desc: 'Win a Battle.',
    descMr: 'लढाई जिंका.',
    check: (ctx) => ctx.runWon && ctx.modesCompleted.includes('battle'),
  },
  {
    id: 'last_stand_victor',
    name: 'Stand of the 300',
    nameMr: 'तीनशेंचा प्रतिकार',
    desc: 'Win Last Stand.',
    descMr: 'अखेरचा प्रतिकार जिंका.',
    check: (ctx) => ctx.runWon && ctx.modesCompleted.includes('lastStand'),
  },
  {
    id: 'all_modes',
    name: 'Shambhu Raje',
    nameMr: 'शंभू राजे',
    desc: 'Win all three modes.',
    descMr: 'तिन्ही प्रकार जिंका.',
    check: (ctx) => ctx.modesCompleted.includes('skirmish') && ctx.modesCompleted.includes('battle') && ctx.modesCompleted.includes('lastStand'),
  },
  {
    id: 'centurion',
    name: 'Centurion',
    nameMr: 'शतकवीर',
    desc: 'Slay 100 enemies total.',
    descMr: 'एकूण १०० शत्रू मारा.',
    check: (ctx) => ctx.totalKills >= 100,
  },
  {
    id: 'swarajya_warrior',
    name: 'Swarajya Warrior',
    nameMr: 'स्वराज्य योद्धा',
    desc: 'Slay 500 enemies total.',
    descMr: 'एकूण ५०० शत्रू मारा.',
    check: (ctx) => ctx.totalKills >= 500,
  },
  {
    id: 'legend',
    name: 'Legend of the Ghats',
    nameMr: 'घाटांची दंतकथा',
    desc: 'Slay 1000 enemies total.',
    descMr: 'एकूण १,००० शत्रू मारा.',
    check: (ctx) => ctx.totalKills >= 1000,
  },
  {
    id: 'combo_fury',
    name: 'Fury Unleashed',
    nameMr: 'प्रकोप मुक्त',
    desc: 'Reach FURY combo tier.',
    descMr: 'प्रकोप कॉम्बो स्तर गाठा.',
    check: (ctx) => ctx.runMaxCombo >= 5,
  },
  {
    id: 'combo_onslaught',
    name: 'Onslaught',
    nameMr: 'आक्रमण',
    desc: 'Reach ONSLAUGHT combo tier.',
    descMr: 'आक्रमण कॉम्बो स्तर गाठा.',
    check: (ctx) => ctx.runMaxCombo >= 8,
  },
  {
    id: 'combo_mythic',
    name: 'Mythic Warrior',
    nameMr: 'अद्भुत योद्धा',
    desc: 'Reach MYTHIC combo tier.',
    descMr: 'अद्भुत कॉम्बो स्तर गाठा.',
    check: (ctx) => ctx.runMaxCombo >= 12,
  },
  {
    id: 'pratapgad',
    name: "Pratapgad's Shadow",
    nameMr: 'प्रतापगडाची छाया',
    desc: 'Slay 20 enemies without taking damage.',
    descMr: 'नुकसान न घेता २० शत्रू मारा.',
    check: (ctx) => ctx.runScore >= 20 && ctx.runDamageTaken === 0,
  },
  {
    id: 'veteran',
    name: 'Veteran',
    nameMr: 'अनुभवी',
    desc: 'Complete 10 runs.',
    descMr: '१० लढाया पूर्ण करा.',
    check: (ctx) => ctx.totalRuns >= 10,
  },
];

export function loadUnlockedAchievements(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* corrupt */ }
  return new Set();
}

function saveUnlockedAchievements(unlocked: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked]));
  } catch { /* full */ }
}

export function checkAchievements(ctx: AchievementContext): Achievement[] {
  const unlocked = loadUnlockedAchievements();
  const newlyUnlocked: Achievement[] = [];

  for (const ach of ACHIEVEMENTS) {
    if (unlocked.has(ach.id)) continue;
    if (ach.check(ctx)) {
      unlocked.add(ach.id);
      newlyUnlocked.push(ach);
    }
  }

  if (newlyUnlocked.length > 0) {
    saveUnlockedAchievements(unlocked);
  }

  return newlyUnlocked;
}
