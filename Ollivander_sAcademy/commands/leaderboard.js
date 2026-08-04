const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const UserStats = require('../models/UserStats');
const SpellData = require('../models/SpellData');

const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

async function buildRankEmbed(guild) {
  const allStats = await UserStats.find({ totalXP: { $gt: 0 } }).sort({ totalXP: -1 }).limit(10);

  if (!allStats.length) {
    return new EmbedBuilder()
      .setColor('#7B2FBE')
      .setTitle('🏆 Leaderboard — الرانك')
      .setDescription('مفيش سحرة لحد دلوقتي!');
  }

  const lines = await Promise.all(allStats.map(async (s, i) => {
    try {
      const member = await guild.members.fetch(s.userId).catch(() => null);
      const name   = member?.nickname || member?.user?.username || 'ساحر مجهول';
      return `${medals[i]} **${name}**\n🏆 Rank ${s.rank || 1} • ⚡ ${s.totalXP} XP`;
    } catch {
      return `${medals[i]} ساحر مجهول\n🏆 Rank ${s.rank || 1} • ⚡ ${s.totalXP} XP`;
    }
  }));

  return new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('🏆 Leaderboard — الرانك')
    .setDescription(lines.join('\n\n'))
    .setFooter({ text: 'أكاديمية أوليفاندرز 🏰' });
}

async function buildWinsEmbed(guild) {
  const allStats = await UserStats.find({ wins: { $gt: 0 } }).sort({ wins: -1 }).limit(10);

  if (!allStats.length) {
    return new EmbedBuilder()
      .setColor('#7B2FBE')
      .setTitle('⚔️ Leaderboard — الانتصارات')
      .setDescription('مفيش مبارزات لحد دلوقتي!');
  }

  const lines = await Promise.all(allStats.map(async (s, i) => {
    try {
      const member   = await guild.members.fetch(s.userId).catch(() => null);
      const name     = member?.nickname || member?.user?.username || 'ساحر مجهول';
      const total    = (s.wins || 0) + (s.losses || 0);
      const winRate  = total > 0 ? Math.round((s.wins / total) * 100) : 0;
      return `${medals[i]} **${name}**\n⚔️ ${s.wins} فوز • 💀 ${s.losses} هزيمة • 🎯 ${winRate}%`;
    } catch {
      return `${medals[i]} ساحر مجهول\n⚔️ ${s.wins} فوز`;
    }
  }));

  return new EmbedBuilder()
    .setColor('#FF4444')
    .setTitle('⚔️ Leaderboard — الانتصارات')
    .setDescription(lines.join('\n\n'))
    .setFooter({ text: 'أكاديمية أوليفاندرز 🏰' });
}

module.exports = {
  name: 'leaderboard',
  async execute(message) {
    const guild = message.guild;

    // نبني الاتنين مع بعض
    const [rankEmbed, winsEmbed] = await Promise.all([
      buildRankEmbed(guild),
      buildWinsEmbed(guild),
    ]);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`lb_rank_${message.author.id}`)
        .setLabel('🏆 الرانك')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`lb_wins_${message.author.id}`)
        .setLabel('⚔️ الانتصارات')
        .setStyle(ButtonStyle.Secondary),
    );

    await message.reply({ embeds: [rankEmbed], components: [row] });
  },

  async handleButton(interaction) {
    const parts  = interaction.customId.split('_');
    const type   = parts[1];
    const userId = parts[2];

    if (interaction.user.id !== userId) {
      return interaction.reply({ content: '❌ مش الـ leaderboard بتاعك!', ephemeral: true });
    }

    const guild = interaction.guild;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`lb_rank_${userId}`)
        .setLabel('🏆 الرانك')
        .setStyle(type === 'rank' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`lb_wins_${userId}`)
        .setLabel('⚔️ الانتصارات')
        .setStyle(type === 'wins' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    );

    const embed = type === 'rank'
      ? await buildRankEmbed(guild)
      : await buildWinsEmbed(guild);

    await interaction.update({ embeds: [embed], components: [row] });
  },
};