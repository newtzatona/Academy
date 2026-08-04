const { EmbedBuilder } = require('discord.js');
const UserStats  = require('../models/UserStats');
const SpellData  = require('../models/SpellData');
const RANKS      = require('../data/ranks');
const { activeDuels } = require('./duel');

const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

// helper عشان نتحقق من الرول
function hasAdminRole(message) {
  return message.member?.roles.cache.has(ADMIN_ROLE_ID);
}

// helper عشان نبعت للـ log channel
async function sendToLog(client, embed) {
  try {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (channel) await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('❌ مشكلة في الـ log channel:', err);
  }
}

function getRank(totalXP) {
  let rank = 1;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (totalXP >= RANKS[i].xpRequired) {
      rank = RANKS[i].rank;
      break;
    }
  }
  return Math.min(rank, 30);
}

module.exports = {

  sendToLog,

  // ====== !endduel ======
  async endduel(message) {
    if (!hasAdminRole(message)) {
      return message.reply('❌ مش عندك صلاحية!');
    }

    let duel = activeDuels.get(message.author.id);

    if (!duel) {
      for (const [key, val] of activeDuels.entries()) {
        if (typeof val === 'object' && val.challenger && val.opponent) {
          duel = val;
          break;
        }
      }
    }

    if (!duel) return message.reply('❌ مفيش مبارزة شغالة دلوقتي!');

    const p1 = duel.players[duel.challenger];
    const p2 = duel.players[duel.opponent];

    clearTimeout(duel.timer);
    activeDuels.delete(duel.challenger);
    activeDuels.delete(duel.opponent);

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🛑 المبارزة اتوقفت!')
      .setDescription('المبارزة اتنهت بدون فايز!')
      .addFields(
        { name: p1.username, value: `❤️ ${p1.hp}/250`, inline: true },
        { name: p2.username, value: `❤️ ${p2.hp}/250`, inline: true },
      );

    return message.channel.send({ embeds: [embed] });
  },

  // ====== !win @user ======
  async win(message, args) {
    if (!hasAdminRole(message)) {
      return message.reply('❌ مش عندك صلاحية!');
    }

    const winner = message.mentions.users.first();
    if (!winner) return message.reply('❌ لازم تمنشن الفايز! مثلاً: `!win @user`');

    let duel = null;
    for (const [key, val] of activeDuels.entries()) {
      if (typeof val === 'object' && val.challenger && val.opponent) {
        if (val.challenger === winner.id || val.opponent === winner.id) {
          duel = val;
          break;
        }
      }
    }

    if (!duel) return message.reply('❌ مفيش مبارزة شغالة لهذا اللاعب!');

    const loserId = duel.challenger === winner.id ? duel.opponent : duel.challenger;
    const p1      = duel.players[duel.challenger];
    const p2      = duel.players[duel.opponent];

    clearTimeout(duel.timer);
    activeDuels.delete(duel.challenger);
    activeDuels.delete(duel.opponent);

    await UserStats.findOneAndUpdate(
      { userId: winner.id },
      { $inc: { wins: 1 } },
      { upsert: true }
    );
    await UserStats.findOneAndUpdate(
      { userId: loserId },
      { $inc: { losses: 1 } },
      { upsert: true }
    );

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🏆 ${winner.username} فاز بالمبارزة!`)
      .setDescription(`تم الإعلان عن الفايز من قِبل الحكم!`)
      .addFields(
        { name: p1.username, value: `❤️ ${p1.hp}/250`, inline: true },
        { name: p2.username, value: `❤️ ${p2.hp}/250`, inline: true },
      );

    return message.channel.send({ embeds: [embed] });
  },

  // ====== !addxp ======
  async addxp(message, args) {
    if (!hasAdminRole(message)) {
      return message.reply('❌ مش عندك صلاحية!');
    }

    const target = message.mentions.users.first();
    if (!target) return message.reply('❌ لازم تمنشن اليوزر! مثلاً: `!addxp @user spell Stupefy 100`');

    const type = args[1]?.toLowerCase();

    // !addxp @user spell Stupefy 100
    if (type === 'spell') {
      const spellName = args[2];
      const amount    = parseInt(args[3]);

      if (!spellName || isNaN(amount)) {
        return message.reply('❌ الصيغة الصح: `!addxp @user spell Stupefy 100`');
      }

      const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000];

      let data = await SpellData.findOne({ userId: target.id, spellName });
      if (!data) {
        data = new SpellData({ userId: target.id, spellName, totalXP: 0, level: 1, lastTrained: 0 });
      }

      data.totalXP += amount;

      // تحديث الليفل
      let level = 1;
      for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (data.totalXP >= LEVEL_THRESHOLDS[i]) {
          level = i + 1;
          break;
        }
      }
      data.level = Math.min(level, 5);
      await data.save();

      // تحديث الرانك
      const allSpells = await SpellData.find({ userId: target.id });
      const totalXP   = allSpells.reduce((sum, s) => sum + s.totalXP, 0);
      const newRank   = getRank(totalXP);
      await UserStats.findOneAndUpdate(
        { userId: target.id },
        { totalXP, rank: newRank },
        { upsert: true }
      );

      const embed = new EmbedBuilder()
        .setColor('#4ade80')
        .setTitle('✅ اتضاف XP!')
        .setDescription(`اتضاف **${amount} XP** لتعويذة **${spellName}** لـ **${target.username}**`)
        .addFields(
          { name: '📊 المستوى الجديد', value: `${data.level}`, inline: true },
          { name: '⚡ XP الكلي للتعويذة', value: `${data.totalXP}`, inline: true },
          { name: '🏆 الرانك الجديد', value: `Rank ${newRank}`, inline: true },
        );

      return message.reply({ embeds: [embed] });
    }

    // !addxp @user rank 500
    if (type === 'rank') {
      const amount = parseInt(args[2]);
      if (isNaN(amount)) {
        return message.reply('❌ الصيغة الصح: `!addxp @user rank 500`');
      }

      const userStats = await UserStats.findOneAndUpdate(
        { userId: target.id },
        { $inc: { totalXP: amount } },
        { upsert: true, new: true }
      );

      const newRank = getRank(userStats.totalXP);
      await UserStats.findOneAndUpdate({ userId: target.id }, { rank: newRank });

      const embed = new EmbedBuilder()
        .setColor('#4ade80')
        .setTitle('✅ اتضاف XP للرانك!')
        .setDescription(`اتضاف **${amount} XP** للرانك بتاع **${target.username}**`)
        .addFields(
          { name: '⚡ XP الكلي', value: `${userStats.totalXP}`, inline: true },
          { name: '🏆 الرانك الجديد', value: `Rank ${newRank}`, inline: true },
        );

      return message.reply({ embeds: [embed] });
    }

    return message.reply('❌ النوع غلط! استخدم `spell` أو `rank`\nمثلاً:\n`!addxp @user spell Stupefy 100`\n`!addxp @user rank 500`');
  },
};