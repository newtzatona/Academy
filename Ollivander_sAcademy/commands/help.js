const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  async execute(message) {
    const isInstructor = message.member?.roles.cache.has(process.env.ADMIN_ROLE_ID);

    const embed = new EmbedBuilder()
      .setColor('#7B2FBE')
      .setTitle('📚 أوليفاندرز أكاديمي — قائمة الأوامر')
      .setDescription('مرحباً بك في أكاديمية أوليفاندرز! 🪄\nدي قائمة بكل الأوامر المتاحة:')
      .addFields(
        {
          name: '🪄 التدريب',
          value: [
            '`!train <اسم_التعويذة>` — تتدرب على تعويذة معينة',
            '`!use <اسم_التعويذة>` — تفتح السكرول وتفك قفل التعويذة قبل التدريب',
            '`!spells` — تشوف كل التعاويذ المتاحة وتقدمك فيها',
          ].join('\n'),
        },
        {
          name: '🎒 السكرولز',
          value: [
            '`!inventory` — تشوف السكرولز اللي معاك',
          ].join('\n'),
        },
        {
          name: '⚔️ المبارزة',
          value: [
            '`!duel @user` — تتحدى ساحر تاني على مبارزة',
          ].join('\n'),
        },
        {
          name: '📊 المعلومات',
          value: [
            '`!rank` — تشوف رانكك ومجموع XP بتاعك',
            '`!leaderboard` أو `!lb` — تشوف أقوى السحرة في السيرفر',
            '`!help` — تشوف قائمة الأوامر دي',
          ].join('\n'),
        },
      )
      .setFooter({ text: 'أكاديمية أوليفاندرز للسحر والتعاويذ 🏰' });

    if (isInstructor) {
      embed.addFields({
        name: '🎓 أوامر المدربين',
        value: [
          '`!add-scroll @user <اسم_التعويذة>` — تضيف سكرول لطالب',
          '`!addxp @user spell <اسم_التعويذة> <رقم>` — تزود XP لتعويذة معينة',
          '`!addxp @user rank <رقم>` — تزود XP لرانك الطالب',
          '`!endduel` — توقف مبارزة شغالة بدون فايز',
          '`!win @user` — تعلن فايز مبارزة يدوياً',
        ].join('\n'),
      });
    }

    return message.reply({ embeds: [embed] });
  },
};