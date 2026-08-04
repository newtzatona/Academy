const { createRankCardAttachment } = require('../utils/imageBars');
const UserStats = require('../models/UserStats');
const RANKS     = require('../data/ranks');

module.exports = {
  name: 'rank',
  async execute(message) {
    const userId = message.author.id;
    const userStats = await UserStats.findOne({ userId });

    if (!userStats || !userStats.totalXP) {
      return message.reply('❌ مش اتدربت على أي تعويذة لحد دلوقتي! ابدأ بـ `!train`');
    }

    const rank            = userStats.rank || 1;
    const totalXP          = userStats.totalXP || 0;
    const currentRankData = RANKS[rank - 1];
    const nextRankData    = RANKS[rank] ?? null;

    const rankXPCurrent = totalXP - currentRankData.xpRequired;
    const rankXPNeeded  = nextRankData ? nextRankData.xpRequired - currentRankData.xpRequired : null;

    let serverPosition = null;
    let serverTotal     = null;

    try {
      const members = await message.guild.members.fetch();
      const memberIds = [...members.keys()];

      const guildStats = await UserStats.find({
        userId: { $in: memberIds },
        totalXP: { $gt: 0 },
      }).sort({ totalXP: -1 });

      const idx = guildStats.findIndex(s => s.userId === userId);
      if (idx !== -1) {
        serverPosition = idx + 1;
        serverTotal     = guildStats.length;
      }
    } catch (err) {
      console.error('❌ خطأ في حساب ترتيب السيرفر:', err);
    }

    const displayName = message.member?.nickname || message.author.username;

    const rankAttachment = await createRankCardAttachment({
      username: displayName,
      rank,
      totalXP,
      rankXPCurrent,
      rankXPNeeded,
      wins: userStats.wins || 0,
      losses: userStats.losses || 0,
      serverPosition,
      serverTotal,
    });

    return message.reply({ files: [rankAttachment] });
  },
};