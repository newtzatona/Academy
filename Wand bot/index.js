require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const mongoose = require('mongoose');
const WandData = require('./models/WandData');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000,
  family: 4,
})
  .then(() => console.log('✅ اتوصلنا بـ MongoDB!'))
  .catch(err => console.error('❌ مشكلة في MongoDB:', err));

const sessions = new Map();

const MASTERIES = ['darkArts', 'transfiguration', 'charms', 'healing', 'defense'];
const MASTERY_NAMES = {
  darkArts:        'Mastery of Dark Arts',
  transfiguration: 'Mastery of Transfiguration',
  charms:          'Mastery of Charms',
  healing:         'Mastery of Healing',
  defense:         'Mastery of Defense',
};

client.once('ready', () => {
  console.log(`✅ Wand Bot شغال! سجلت كـ ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // جلسة make-wand
  if (sessions.has(message.author.id)) {
    const session = sessions.get(message.author.id);

    if (session.step === 'name') {
      session.name = message.content;
      session.step = 'wood';
      return message.reply('🪵 إيه نوع الخشب؟');
    }
    if (session.step === 'wood') {
      session.wood = message.content;
      session.step = 'core';
      return message.reply('💎 إيه الكور؟');
    }
    if (session.step === 'core') {
      session.core = message.content;
      session.step = 'length';
      return message.reply('📏 إيه الطول؟');
    }
    if (session.step === 'length') {
      session.length = message.content;
      session.step = 'image';
      return message.reply('🖼️ ابعت لينك الصورة؟');
    }
    if (session.step === 'image') {
      session.imageUrl = message.content;
      session.step = 'masteryCount';

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('count_1').setLabel('1').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('count_2').setLabel('2').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('count_3').setLabel('3').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('count_4').setLabel('4').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('count_5').setLabel('5').setStyle(ButtonStyle.Primary),
      );

      return message.reply({ content: '⚡ كام مهارة عايز تضيف؟', components: [row] });
    }
  }

  if (!message.content.startsWith('!')) return;

  const args    = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ====== make-wand ======
  if (command === 'make-wand') {
    const target = message.mentions.users.first();
    if (!target) return message.reply('❌ لازم تمنشن اليوزر! مثلاً: `!make-wand @user`');
    sessions.set(message.author.id, { targetId: target.id, step: 'name' });
    return message.reply('✏️ إيه اسم العصا؟');
  }

  // ====== wand ======
  if (command === 'wand') {
    const target = message.mentions.users.first() || message.author;
    const wand = await WandData.findOne({ userId: target.id });
    if (!wand) return message.reply('❌ المستخدم ده معندوش عصا!');

    const totalPower = Object.values(wand.masteries).reduce((a, b) => a + b, 0);
    const masteriesList = MASTERIES
      .filter(m => wand.masteries[m] > 0)
      .map(m => `• ${MASTERY_NAMES[m]} (${wand.masteries[m]})`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle(`✨ ${wand.name}`)
      .addFields(
        { name: 'Total Power', value: `${totalPower}`, inline: true },
        { name: 'Wood',        value: wand.wood,       inline: true },
        { name: 'Core',        value: wand.core,       inline: true },
        { name: 'Length',      value: wand.length,     inline: true },
        { name: '📚 Masteries', value: masteriesList || 'لا يوجد' },
      )
      .setImage(wand.imageUrl);

    return message.reply({ embeds: [embed] });
  }

  // ====== delete-wand ======
  if (command === 'delete-wand') {
    const target = message.mentions.users.first();
    if (!target) return message.reply('❌ لازم تمنشن اليوزر! مثلاً: `!delete-wand @user`');

    const wand = await WandData.findOne({ userId: target.id });
    if (!wand) return message.reply('❌ المستخدم ده معندوش عصا!');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`confirmdelete_${target.id}`).setLabel('✅ تأكيد الحذف').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`canceldelete`).setLabel('❌ إلغاء').setStyle(ButtonStyle.Secondary),
    );

    return message.reply({ content: `⚠️ متأكد إنك عايز تحذف عصا **${target.username}**؟`, components: [row] });
  }

  // ====== edit-wand ======
  if (command === 'edit-wand') {
    const target = message.mentions.users.first();
    if (!target) return message.reply('❌ لازم تمنشن اليوزر! مثلاً: `!edit-wand @user`');

    const wand = await WandData.findOne({ userId: target.id });
    if (!wand) return message.reply('❌ المستخدم ده معندوش عصا!');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`edit_name_${target.id}`).setLabel('✏️ الاسم').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`edit_wood_${target.id}`).setLabel('🪵 الخشب').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`edit_core_${target.id}`).setLabel('💎 الكور').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`edit_length_${target.id}`).setLabel('📏 الطول').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`edit_image_${target.id}`).setLabel('🖼️ الصورة').setStyle(ButtonStyle.Primary),
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`edit_addskill_${target.id}`).setLabel('➕ إضافة مهارة').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`edit_removeskill_${target.id}`).setLabel('➖ إزالة مهارة').setStyle(ButtonStyle.Danger),
    );

    return message.reply({ content: `✏️ إيه اللي عايز تعدله في عصا **${target.username}**؟`, components: [row, row2] });
  }
});

// ============================
// BUTTONS
// ============================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const session = sessions.get(interaction.user.id);

  // ====== make-wand buttons ======
  if (interaction.customId.startsWith('count_') && session) {
    const count = parseInt(interaction.customId.split('_')[1]);
    session.masteryCount   = count;
    session.masteries      = {};
    session.currentMastery = 0;
    session.step           = 'masterySelect';

    const row = new ActionRowBuilder().addComponents(
      MASTERIES.map(m =>
        new ButtonBuilder()
          .setCustomId(`mastery_${m}`)
          .setLabel(MASTERY_NAMES[m])
          .setStyle(ButtonStyle.Secondary)
      )
    );

    return interaction.update({ content: `اختار المهارة ${session.currentMastery + 1} من ${count}:`, components: [row] });
  }

  if (interaction.customId.startsWith('mastery_') && session) {
    const mastery = interaction.customId.split('_')[1];

    if (session.masteries[mastery]) {
      return interaction.reply({ content: '❌ المهارة دي اتختارت قبل كده!', ephemeral: true });
    }

    session.masteries[mastery] = 1;
    session.currentMastery++;

    if (session.currentMastery < session.masteryCount) {
      const row = new ActionRowBuilder().addComponents(
        MASTERIES
          .filter(m => !session.masteries[m])
          .map(m =>
            new ButtonBuilder()
              .setCustomId(`mastery_${m}`)
              .setLabel(MASTERY_NAMES[m])
              .setStyle(ButtonStyle.Secondary)
          )
      );
      return interaction.update({ content: `اختار المهارة ${session.currentMastery + 1} من ${session.masteryCount}:`, components: [row] });
    } else {
      let wand = await WandData.findOne({ userId: session.targetId });
      if (!wand) wand = new WandData({ userId: session.targetId });

      wand.name      = session.name;
      wand.wood      = session.wood;
      wand.core      = session.core;
      wand.length    = session.length;
      wand.imageUrl  = session.imageUrl;
      wand.masteries = {
        darkArts:        session.masteries.darkArts        || 0,
        transfiguration: session.masteries.transfiguration || 0,
        charms:          session.masteries.charms          || 0,
        healing:         session.masteries.healing         || 0,
        defense:         session.masteries.defense         || 0,
      };

      await wand.save();
      sessions.delete(interaction.user.id);
      return interaction.update({ content: '✅ اتحفظت العصا بنجاح!', components: [] });
    }
  }

  // ====== delete-wand buttons ======
  if (interaction.customId.startsWith('confirmdelete_')) {
    const targetId = interaction.customId.split('_')[1];
    await WandData.deleteOne({ userId: targetId });
    return interaction.update({ content: '✅ اتحذفت العصا بنجاح!', components: [] });
  }

  if (interaction.customId === 'canceldelete') {
    return interaction.update({ content: '❌ اتألغ الحذف!', components: [] });
  }

  // ====== edit-wand buttons ======
  if (interaction.customId.startsWith('edit_')) {
    const parts    = interaction.customId.split('_');
    const editType = parts[1];
    const targetId = parts[2];

    if (editType === 'addskill') {
      const wand = await WandData.findOne({ userId: targetId });
      if (!wand) return interaction.reply({ content: '❌ مفيش عصا!', ephemeral: true });

      const available = MASTERIES.filter(m => !wand.masteries[m] || wand.masteries[m] === 0);
      if (!available.length) return interaction.reply({ content: '❌ العصا عندها كل المهارات خلاص!', ephemeral: true });

      const row = new ActionRowBuilder().addComponents(
        available.map(m =>
          new ButtonBuilder()
            .setCustomId(`addskillconfirm_${targetId}_${m}`)
            .setLabel(MASTERY_NAMES[m])
            .setStyle(ButtonStyle.Success)
        )
      );

      return interaction.update({ content: '➕ اختار المهارة اللي عايز تضيفها:', components: [row] });
    }

    if (editType === 'removeskill') {
      const wand = await WandData.findOne({ userId: targetId });
      if (!wand) return interaction.reply({ content: '❌ مفيش عصا!', ephemeral: true });

      const existing = MASTERIES.filter(m => wand.masteries[m] > 0);
      if (!existing.length) return interaction.reply({ content: '❌ مفيش مهارات تتشال!', ephemeral: true });

      const row = new ActionRowBuilder().addComponents(
        existing.map(m =>
          new ButtonBuilder()
            .setCustomId(`removeskillconfirm_${targetId}_${m}`)
            .setLabel(MASTERY_NAMES[m])
            .setStyle(ButtonStyle.Danger)
        )
      );

      return interaction.update({ content: '➖ اختار المهارة اللي عايز تشيلها:', components: [row] });
    }

    // تعديل الحقول الأخرى
    const fieldNames = { name: 'الاسم', wood: 'الخشب', core: 'الكور', length: 'الطول', image: 'لينك الصورة' };
    sessions.set(interaction.user.id, { targetId, step: `editfield_${editType}` });
    return interaction.update({ content: `✏️ اكتب ${fieldNames[editType]} الجديد:`, components: [] });
  }

  if (interaction.customId.startsWith('addskillconfirm_')) {
    const [, targetId, mastery] = interaction.customId.split('_');
    await WandData.findOneAndUpdate({ userId: targetId }, { [`masteries.${mastery}`]: 1 });
    return interaction.update({ content: `✅ اتضافت مهارة **${MASTERY_NAMES[mastery]}** بنجاح!`, components: [] });
  }

  if (interaction.customId.startsWith('removeskillconfirm_')) {
    const [, targetId, mastery] = interaction.customId.split('_');
    await WandData.findOneAndUpdate({ userId: targetId }, { [`masteries.${mastery}`]: 0 });
    return interaction.update({ content: `✅ اتشالت مهارة **${MASTERY_NAMES[mastery]}** بنجاح!`, components: [] });
  }
});

client.login(process.env.TOKEN);