const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Inventory = require('../models/Inventory');
const SpellData = require('../models/SpellData');
const spellsDB  = require('../data/spells');

const categoryEmoji = {
  darkArts:        '🌑',
  charms:          '✨',
  transfiguration: '🔄',
  healing:         '💚',
  defense:         '🛡️',
};

function normalizeImageUrl(url) {
  const trimmed = url.trim();

  const fileIdMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileIdMatch) {
    return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
  }

  const queryIdMatch = trimmed.match(/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([^&]+)/);
  if (queryIdMatch) {
    return `https://drive.google.com/uc?export=view&id=${queryIdMatch[1]}`;
  }

  return trimmed;
}

function getImageUrlFromMessage(msg) {
  const attachment = msg.attachments.find(a => a.contentType?.startsWith('image/'));
  if (attachment) return attachment.url;

  const urlMatch = msg.content.match(/https?:\/\/\S+/);
  if (!urlMatch) return null;

  return normalizeImageUrl(urlMatch[0]);
}

async function sendInventoryEmbed(channel, userId, member, page = 0, showButtons = true) {
  const inv = await Inventory.findOne({ userId });

  const displayName = member?.nickname || member?.user?.username || 'Unknown';

  if (!inv || !inv.scrolls.length) {
    const total = 0;
    const embed = new EmbedBuilder()
      .setColor('#7B2FBE')
      .setTitle(`🎒 سكرولز ${displayName}`)
      .setDescription('❌ مش عندك أي سكرولز دلوقتي!');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`inv_prev_${userId}_0`)
        .setLabel('◀️ السابق')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`inv_next_${userId}_0`)
        .setLabel('التالي ▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
    );

    return channel.send({ embeds: [embed], components: showButtons && total > 1 ? [row] : [] });
  }

  const scroll   = inv.scrolls[page];
  const spell    = spellsDB.find(s => s.name === scroll.spellName);
  const emoji    = spell ? categoryEmoji[spell.category] : '🪄';
  const total    = inv.scrolls.length;

  const embed = new EmbedBuilder()
    .setColor('#7B2FBE')
    .setTitle(`🎒 سكرولز ${displayName}`)
    .setDescription(`📜 **${scroll.spellName}** ${emoji}`)
    .addFields(
      { name: `${emoji} الكاتيجوري`, value: spell?.category || 'Unknown', inline: true },
      { name: '⚔️ الـ Stance',       value: spell?.stance   || 'Unknown', inline: true },
    )
    .setFooter({ text: `سكرول ${page + 1} من ${total}` });

  if (scroll.imageUrl) embed.setImage(scroll.imageUrl);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`inv_prev_${userId}_${page}`)
      .setLabel('◀️ السابق')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`inv_next_${userId}_${page}`)
      .setLabel('التالي ▶️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === total - 1),
  );

  return channel.send({ embeds: [embed], components: showButtons && total > 1 ? [row] : [] });
}

module.exports = {

  sendInventoryEmbed,

  // ====== !inventory ======
  async inventory(message) {
    await sendInventoryEmbed(message.channel, message.author.id, message.member);
  },

  // ====== !use <spell> ======
  async use(message, args) {
    if (!args[0]) return message.reply('❌ اكتب اسم التعويذة! مثلاً: `!use Stupefy`');

    const spellName = args[0].charAt(0).toUpperCase() + args[0].slice(1).toLowerCase();
    const spellInfo = spellsDB.find(s => s.name.toLowerCase() === spellName.toLowerCase());

    if (!spellInfo) return message.reply(`❌ التعويذة **${spellName}** مش موجودة!`);

    const userId = message.author.id;
    const inv    = await Inventory.findOne({ userId });
    const scroll = inv?.scrolls.find(s => s.spellName === spellInfo.name);

    if (!scroll) return message.reply(`❌ مش عندك سكرول لـ **${spellInfo.name}**!`);

    const existingSpell = await SpellData.findOne({ userId, spellName: spellInfo.name });
    if (existingSpell) {
      return message.reply(`❌ انت بالفعل فتحت السكرول لـ **${spellInfo.name}** وممكن تتدرب عليها دلوقتي بـ \`!train ${spellInfo.name}\`.`);
    }

    // مسح السكرول من الـ inventory
    await Inventory.findOneAndUpdate(
      { userId },
      { $pull: { scrolls: { spellName: spellInfo.name } } }
    );

    await new SpellData({ userId, spellName: spellInfo.name, totalXP: 0, level: 1, lastTrained: 0 }).save();

    // مسح رسالة اليوزر
    await message.delete().catch(() => {});

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`📜 ${spellInfo.name}`)
      .setDescription(`*فتحت السكرول وبدأت تقرأه بعناية...*\n\nدلوقتي تقدر تتدرب على **${spellInfo.name}** بـ \`!train ${spellInfo.name}\``)
      .addFields(
        { name: `${categoryEmoji[spellInfo.category]} الكاتيجوري`, value: spellInfo.category, inline: true },
        { name: '⚔️ الـ Stance', value: spellInfo.stance, inline: true },
      );

    if (scroll.imageUrl) embed.setImage(scroll.imageUrl);

    const sentMsg = await message.channel.send({ embeds: [embed] });

    // بعد 8 ثواني امسح الرسالة وبعت الـ inventory
    setTimeout(async () => {
      await sentMsg.delete().catch(() => {});
      await sendInventoryEmbed(message.channel, userId, message.member);
    }, 8000);
  },

  // ====== !add-scroll @user <spell> ======
  async addScroll(message, args) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('❌ لازم تمنشن اليوزر! مثلاً: `!add-scroll @user Stupefy`');

    const spellArg = args[1];
    if (!spellArg) return message.reply('❌ اكتب اسم التعويذة! مثلاً: `!add-scroll @user Stupefy`');

    const spellName = spellArg.charAt(0).toUpperCase() + spellArg.slice(1).toLowerCase();
    const spellInfo = spellsDB.find(s => s.name.toLowerCase() === spellName.toLowerCase());
    if (!spellInfo) return message.reply(`❌ التعويذة **${spellName}** مش موجودة!`);

    const askMsg = await message.reply('🖼️ ابعت لينك صورة السكرول (Discord أو Google Drive):');

    const filter    = m => m.author.id === message.author.id;
    const collector = message.channel.createMessageCollector({ filter, time: 60000, max: 1 });

    collector.on('collect', async collected => {
      const imageUrl = getImageUrlFromMessage(collected);
      if (!imageUrl) {
        await collected.reply('❌ ابعت لينك صورة صالح أو ارفع صورة مباشرة!').catch(() => {});
        return;
      }

      await collected.delete().catch(() => {});
      await askMsg.delete().catch(() => {});
      await message.delete().catch(() => {});

      await Inventory.findOneAndUpdate(
        { userId: target.id },
        { $addToSet: { scrolls: { spellName: spellInfo.name, imageUrl } } },
        { upsert: true }
      );

      // جيب الـ member عشان الـ nickname
      const targetMember = await message.guild.members.fetch(target.id).catch(() => null);

      // بعت الـ inventory بتاع اليوزر
      const newInv = await Inventory.findOne({ userId: target.id });
      const newPage = newInv ? newInv.scrolls.length - 1 : 0;
      await sendInventoryEmbed(message.channel, target.id, targetMember, newPage, false);
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        askMsg.delete().catch(() => {});
        message.channel.send('⏰ انتهى الوقت!').then(m => {
          setTimeout(() => m.delete().catch(() => {}), 3000);
        });
      }
    });
  },

  // ====== handle inventory buttons ======
  async handleInventoryButton(interaction) {
    const parts  = interaction.customId.split('_');
    const action = parts[1];
    const userId = parts[2];
    const page   = parseInt(parts[3]);

    if (interaction.user.id !== userId) {
      return interaction.reply({ content: '❌ مش الـ inventory بتاعك!', ephemeral: true });
    }

    const newPage = action === 'next' ? page + 1 : page - 1;

    const inv = await Inventory.findOne({ userId });
    if (!inv || !inv.scrolls.length) {
      return interaction.update({ content: '❌ مش عندك سكرولز!', embeds: [], components: [] });
    }

    const scroll = inv.scrolls[newPage];
    const spell  = spellsDB.find(s => s.name === scroll.spellName);
    const emoji  = spell ? { darkArts: '🌑', charms: '✨', transfiguration: '🔄', healing: '💚', defense: '🛡️' }[spell.category] : '🪄';
    const total  = inv.scrolls.length;

    const embed = new EmbedBuilder()
      .setColor('#7B2FBE')
      .setTitle(`🎒 سكرولز ${interaction.member?.nickname || interaction.user.username}`)
      .setDescription(`📜 **${scroll.spellName}** ${emoji}`)
      .addFields(
        { name: `${emoji} الكاتيجوري`, value: spell?.category || 'Unknown', inline: true },
        { name: '⚔️ الـ Stance',       value: spell?.stance   || 'Unknown', inline: true },
      )
      .setFooter({ text: `سكرول ${newPage + 1} من ${total}` });

    if (scroll.imageUrl) embed.setImage(scroll.imageUrl);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`inv_prev_${userId}_${newPage}`)
        .setLabel('◀️ السابق')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(newPage === 0),
      new ButtonBuilder()
        .setCustomId(`inv_next_${userId}_${newPage}`)
        .setLabel('التالي ▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(newPage === total - 1),
    );

    await interaction.update({ embeds: [embed], components: total > 1 ? [row] : [] });
  },
};