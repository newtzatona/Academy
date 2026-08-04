// كل رانك محتاج XP أكتر من السابق
// الفورمولا: rank * 500 XP للوصول للرانك الجاي

const RANKS = [];

for (let i = 1; i <= 30; i++) {
  RANKS.push({
    rank: i,
    xpRequired: i === 1 ? 0 : Math.floor(((i - 1) * i) / 2) * 500,
  });
}

module.exports = RANKS;