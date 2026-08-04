const { createTrainCardAttachment } = require('../utils/imageBars');
const { EmbedBuilder } = require('discord.js');
const SpellData  = require('../models/SpellData');
const UserStats  = require('../models/UserStats');
const spells     = require('../data/spells');
const RANKS      = require('../data/ranks');

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000];
const COOLDOWN = 60 * 1000;

function getRandomXP() {
  return Math.floor(Math.random() * 31) + 10;
}

function getLevel(xp) {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(level, LEVEL_THRESHOLDS.length);
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

const categoryEmoji = {
  darkArts:        '🌑',
  charms:          '✨',
  transfiguration: '🔄',
  healing:         '💚',
  defense:         '🛡️',
};

const categoryColor = {
  darkArts:        '#1a0a2e',
  charms:          '#2e1a6e',
  transfiguration: '#1a2e6e',
  healing:         '#1a4e2e',
  defense:         '#2e2e1a',
};

const stanceEmoji = {
  aggressive: '⚔️',
  sneaky:     '🥷',
  defensive:  '🛡️',
};

module.exports = {
  name: 'train',
  async execute(message, args) {

    if (!args[0]) {
      return message.reply('❌ اكتب اسم التعويذة! مثلاً: `!train Stupefy`');
    }

    const spellName = args[0].charAt(0).toUpperCase() + args[0].slice(1).toLowerCase();
    const spellData = spells.find(s => s.name.toLowerCase() === spellName.toLowerCase());

    if (!spellData) {
      return message.reply(`❌ التعويذة **${spellName}** مش موجودة!`);
    }

    const userId = message.author.id;
    const now    = Date.now();
    const requiresScroll = !!spellData.requiresScroll;
    let data = await SpellData.findOne({ userId, spellName: spellData.name });

    if (!data && requiresScroll) {
      return message.reply(`❌ التعويذة **${spellData.name}** لازم تستخدم السكرول أولاً: \`!use ${spellData.name}\``);
    }

    if (!data) {
      data = new SpellData({ userId, spellName: spellData.name, totalXP: 0, level: 1, lastTrained: 0 });
    }

    const timePassed = now - data.lastTrained;
    if (timePassed < COOLDOWN) {
      const remaining = COOLDOWN - timePassed;
      const minutes   = Math.floor(remaining / 60000);
      const seconds   = Math.floor((remaining % 60000) / 1000);

      const cooldownEmbed = new EmbedBuilder()
        .setColor('#ff4444')
        .setTitle(`⏳ تدريب ${spellData.name}`)
        .setDescription(`لازم تستنى قبل ما تتدرب تاني!\n\n**الوقت المتبقي:** \`${minutes}د ${seconds}ث\``)
        .setFooter({ text: 'أكاديمية أوليفاندرز 🏰' });

      return message.reply({ embeds: [cooldownEmbed] });
    }

    const earned   = getRandomXP();
    const oldLevel = data.level;
    data.totalXP  += earned;
    data.level     = getLevel(data.totalXP);
    data.lastTrained = now;
    await data.save();

    const allSpells = await SpellData.find({ userId });
    const totalXP   = allSpells.reduce((sum, s) => sum + s.totalXP, 0);
    const newRank   = getRank(totalXP);
    const userStats = await UserStats.findOneAndUpdate(
      { userId },
      { totalXP, rank: newRank },
      { upsert: true, returnDocument: 'after' }
    );
    const oldRank   = userStats.rank || 1;
    const rankUp    = newRank > oldRank;
    const leveledUp = data.level > oldLevel;

    const levelIndex   = data.level - 1;
    const currentStats = spellData.levels[levelIndex];

    const nextLevelThreshold = LEVEL_THRESHOLDS[data.level] ?? null;
    const spellXPCurrent     = data.totalXP - LEVEL_THRESHOLDS[data.level - 1];
    const spellXPNeeded      = nextLevelThreshold ? nextLevelThreshold - LEVEL_THRESHOLDS[data.level - 1] : null;

    const currentRankData = RANKS[newRank - 1];
    const nextRankData    = RANKS[newRank] ?? null;
    const rankXPCurrent   = totalXP - currentRankData.xpRequired;
    const rankXPNeeded    = nextRankData ? nextRankData.xpRequired - currentRankData.xpRequired : null;

    const displayName = message.member?.nickname || message.author.username;

    const trainAttachment = await createTrainCardAttachment({
      username: displayName,
      spellName: spellData.name,
      spellEmoji: categoryEmoji[spellData.category],
      stance: spellData.stance,
      stanceEmoji: stanceEmoji[spellData.stance],
      level: data.level,
      damage: currentStats.damage ?? currentStats.healing ?? 0,
      accuracy: currentStats.accuracy,
      critChance: currentStats.critChance,
      mana: currentStats.mana,
      category: spellData.category,
      earnedXP: earned,
      spellCurrent: spellXPCurrent,
      spellMax: spellXPNeeded,
      spellColor: '#a78bfa',
      rankNum: newRank,
      rankCurrent: rankXPCurrent,
      rankMax: rankXPNeeded,
    });

    const color = leveledUp && rankUp ? '#FFD700' :
                  leveledUp           ? '#c084fc' :
                  rankUp              ? '#4ade80' :
                  categoryColor[spellData.category] || '#7B2FBE';

                  const title = leveledUp && rankUp ? `🎉 SPELL LEVEL UP + LEVEL UP!` :
                  leveledUp           ? `✨ SPELL LEVEL UP! ${spellData.name}` :
                  rankUp              ? `🏆 LEVEL UP! الليفل ${newRank}` :
                  `${categoryEmoji[spellData.category]} تدريب: ${spellData.name}`;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: displayName, iconURL: message.author.displayAvatarURL() })
      .setTitle(title)
      .setDescription(`*${currentStats.flavorText}*`)
      .setImage(`attachment://${trainAttachment.name}`)
      .setFooter({ text: `أكاديمية أوليفاندرز 🏰 • التدريب الجاي بعد ساعتين` });

    return message.reply({ embeds: [embed], files: [trainAttachment] });
  },
};