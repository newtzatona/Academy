const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });
const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

const train        = require('./commands/train');
const spellsCmd    = require('./commands/spells');
const duelCmd      = require('./commands/duel');
const helpCmd      = require('./commands/help');
const rankCmd      = require('./commands/rank');
const adminCmd     = require('./commands/admin');
const inventoryCmd = require('./commands/inventory');
const lbCmd        = require('./commands/leaderboard');

const dbOptions = {
  serverSelectionTimeoutMS: 10000,
  family: 4,
  tls: true,
  authSource: 'admin',
  retryWrites: true,
  w: 'majority',
};

mongoose.connect(process.env.MONGO_URI, dbOptions)
  .then(() => console.log('✅ اتوصلنا بـ Academy DB!'))
  .catch(err => console.error('❌ مشكلة في Academy DB:', err));

const wandDB = mongoose.createConnection(process.env.WAND_URI, dbOptions);

wandDB.on('connected', () => console.log('✅ اتوصلنا بـ Wand DB!'));
wandDB.on('error', (err) => console.error('❌ مشكلة في Wand DB:', err));

wandDB.once('open', () => {
  const WandSchema = require('./models/WandData').schema;
  global.WandModel = wandDB.model('Wand', WandSchema);
  console.log('✅ Wand Model جاهز!');
});

global.getDisplayName = (member) => {
  return member.nickname || member.user.username;
};

client.once('ready', () => {
  console.log(`✅ البوت شغال! سجلت كـ ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  try {
    const args    = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'train')                        await train.execute(message, args);
    if (command === 'spells')                       await spellsCmd.execute(message, args);
    if (command === 'duel')                         await duelCmd.execute(message, args);
    if (command === 'help')                         await helpCmd.execute(message);
    if (command === 'rank')                         await rankCmd.execute(message);
    if (command === 'endduel')                      await adminCmd.endduel(message);
    if (command === 'win')                          await adminCmd.win(message, args);
    if (command === 'inventory')                    await inventoryCmd.inventory(message);
    if (command === 'use')                          await inventoryCmd.use(message, args);
    if (command === 'add-scroll')                   await inventoryCmd.addScroll(message, args);
    if (command === 'leaderboard' || command === 'lb') await lbCmd.execute(message);
    if (command === 'addxp')                        await adminCmd.addxp(message, args);
  } catch (err) {
    console.error(`❌ خطأ في أمر ${message.content}:`, err);
    message.reply('❌ حصل خطأ، جرّب تاني بعد شوية.').catch(() => {});
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('spells_cat_')) {
        await spellsCmd.handleSelect(interaction);
      }
      return;
    }

    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('spells_')) {
      await spellsCmd.handleButton(interaction);
      return;
    }
    if (interaction.customId.startsWith('inv_')) {
      await inventoryCmd.handleInventoryButton(interaction);
      return;
    }
    if (interaction.customId.startsWith('lb_')) {
      await lbCmd.handleButton(interaction);
      return;
    }
    await duelCmd.handleButton(interaction);
  } catch (err) {
    console.error('❌ خطأ في interaction:', err);
    if (!interaction.replied && !interaction.deferred) {
      interaction.reply({ content: '❌ حصل خطأ، جرّب تاني.', ephemeral: true }).catch(() => {});
    }
  }
});

client.login(process.env.TOKEN);