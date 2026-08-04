const { createDuelStatusAttachment } = require('../utils/imageBars');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const UserStats = require('../models/UserStats');
const SpellData = require('../models/SpellData');
const spellsDB  = require('../data/spells');

const activeDuels = new Map();

const categoryToMastery = {
  darkArts:        'darkArts',
  charms:          'charms',
  transfiguration: 'transfiguration',
  healing:         'healing',
  defense:         'defense',
};

const effectEmoji = {
  bleed:   '🩸',
  burn:    '🔥',
  stun:    '⚡',
  silence: '🔇',
  shield:  '🛡️',
  cleanse: '✨',
};

async function getWandBonus(userId, spellCategory) {
  try {
    const WandModel = global.WandModel;
    if (!WandModel) return 1.0;
    const wand = await WandModel.findOne({ userId });
    if (!wand) return 1.0;
    const masteryKey    = categoryToMastery[spellCategory];
    if (!masteryKey) return 1.0;
    const masteryPoints = wand.masteries[masteryKey] || 0;
    return 1.0 + (masteryPoints * 0.10);
  } catch (err) {
    return 1.0;
  }
}

async function getUserSpells(userId) {
  const userSpells = await SpellData.find({ userId });
  return userSpells.map(entry => {
    const spellInfo = spellsDB.find(s => s.name === entry.spellName);
    if (!spellInfo) return null;
    return {
      name:     spellInfo.name,
      category: spellInfo.category,
      stance:   spellInfo.stance,
      level:    entry.level,
      stats:    spellInfo.levels[entry.level - 1],
    };
  }).filter(Boolean);
}

function hpBar(current, max) {
  const pct    = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(pct * 10);
  const bar    = '█'.repeat(filled) + '░'.repeat(10 - filled);
  return `\`${bar}\` **${current}**/${max}`;
}

function manaBar(current, max) {
  const filled = Math.round((current / max) * 8);
  return `\`${'▰'.repeat(filled)}${'▱'.repeat(8 - filled)}\` ${current}`;
}

function isStunned(player) {
  return player.activeEffects.some(e => e.type === 'stun' && !e.pending);
}

function effectsBadges(effects) {
  if (!effects || !effects.length) return '—';
  return effects.map(e => {
    const emoji = effectEmoji[e.type] || '❓';
    const dmg   = e.value ? ` ${e.value}hp` : '';
    const pend  = e.pending ? '⏳' : '';
    return `${emoji}${pend} \`${e.type}·${e.duration}t${dmg}\``;
  }).join('  ');
}

function activatePendingEffects(player, events) {
  for (const eff of player.activeEffects) {
    if (!eff.pending) continue;
    eff.pending = false;
    if (eff.type === 'bleed' || eff.type === 'burn') {
      events.push(`${effectEmoji[eff.type]} **${eff.type}** activated on **${player.username}** — **${eff.value} HP**/turn`);
    }
  }
}

async function buildStatusEmbed(duel) {
  const p1 = duel.players[duel.challenger];
  const p2 = duel.players[duel.opponent];

  const attachment = await createDuelStatusAttachment(p1, p2);

  const embed = new EmbedBuilder()
    .setColor('#2B2D31')
    .setDescription(`**TURN ${duel.turn}**  ·  ⚔️  Duel`)
    .setImage(`attachment://${attachment.name}`);

  return { embed, attachment };
}

async function buildRoundEmbed(duel, events) {
  const p1 = duel.players[duel.challenger];
  const p2 = duel.players[duel.opponent];

  const attachment = await createDuelStatusAttachment(p1, p2);

  const embed = new EmbedBuilder()
    .setColor('#2B2D31')
    .setTitle(`⚔️ Turn ${duel.turn - 1} — Results`)
    .setImage(`attachment://${attachment.name}`);

  if (events.length) {
    for (const e of events) {
      embed.addFields({ name: '\u200b', value: e, inline: false });
    }
  } else {
    embed.setDescription('—');
  }

  return { embed, attachment };
}

async function buildEndEmbed(winner, loser, p1, p2, events) {
  const attachment = await createDuelStatusAttachment(p1, p2);

  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle(`🏆 ${winner.username} wins!`)
    .setImage(`attachment://${attachment.name}`);

  if (events.length) {
    for (const e of events) {
      embed.addFields({ name: '\u200b', value: e, inline: false });
    }
  } else {
    embed.setDescription('—');
  }

  return { embed, attachment };
}

async function sendSpellChoices(duel, channel) {
  const p1 = duel.players[duel.challenger];
  const p2 = duel.players[duel.opponent];

  if (isStunned(p1)) {
    duel.actions[duel.challenger] = null;
    await channel.send(`⚡ **${p1.username}** is stunned — skipping this turn!`);
  } else {
    const p1Spells = (await getUserSpells(duel.challenger)).filter(s => s.stance === p1.stance);
    const p1Embed = new EmbedBuilder()
      .setColor('#2B2D31')
      .setTitle(`🧙 ${p1.username} — choose your spell`)
      .setDescription(
        p1Spells.slice(0, 5).map(s => {
          const eff = s.stats.effect;
          const effText = eff ? `  \`${eff.type}${eff.duration ? `·${eff.duration}t` : ''}${eff.value ? `·${eff.value}hp` : ''}\`` : '';
          return `**${s.name}** Lv.${s.level}  💥\`${s.stats.damage ?? s.stats.healing ?? 0}\`  🎯\`${s.stats.accuracy}%\`  🔮\`${s.stats.mana}\`${effText}`;
        }).join('\n') || 'No spells available for this stance!'
      );

    if (p1Spells.length) {
      const p1Row = new ActionRowBuilder().addComponents(
        p1Spells.slice(0, 5).map(s =>
          new ButtonBuilder()
            .setCustomId(`cast_${duel.challenger}_${s.name}`)
            .setLabel(`${s.name} (Lv.${s.level})`)
            .setStyle(ButtonStyle.Primary)
        )
      );
      await channel.send({ embeds: [p1Embed], components: [p1Row] });
    } else {
      duel.actions[duel.challenger] = null;
      await channel.send({ embeds: [p1Embed] });
    }
  }

  if (isStunned(p2)) {
    duel.actions[duel.opponent] = null;
    await channel.send(`⚡ **${p2.username}** is stunned — skipping this turn!`);
  } else {
    const p2Spells = (await getUserSpells(duel.opponent)).filter(s => s.stance === p2.stance);
    const p2Embed = new EmbedBuilder()
      .setColor('#2B2D31')
      .setTitle(`🧙 ${p2.username} — choose your spell`)
      .setDescription(
        p2Spells.slice(0, 5).map(s => {
          const eff = s.stats.effect;
          const effText = eff ? `  \`${eff.type}${eff.duration ? `·${eff.duration}t` : ''}${eff.value ? `·${eff.value}hp` : ''}\`` : '';
          return `**${s.name}** Lv.${s.level}  💥\`${s.stats.damage ?? s.stats.healing ?? 0}\`  🎯\`${s.stats.accuracy}%\`  🔮\`${s.stats.mana}\`${effText}`;
        }).join('\n') || 'No spells available for this stance!'
      );

    if (p2Spells.length) {
      const p2Row = new ActionRowBuilder().addComponents(
        p2Spells.slice(0, 5).map(s =>
          new ButtonBuilder()
            .setCustomId(`cast_${duel.opponent}_${s.name}`)
            .setLabel(`${s.name} (Lv.${s.level})`)
            .setStyle(ButtonStyle.Primary)
        )
      );
      await channel.send({ embeds: [p2Embed], components: [p2Row] });
    } else {
      duel.actions[duel.opponent] = null;
      await channel.send({ embeds: [p2Embed] });
    }
  }

  if (duel.actions[duel.challenger] !== undefined && duel.actions[duel.opponent] !== undefined) {
    setTimeout(() => resolveRound(duel, channel), 2000);
  } else {
    duel.timer = setTimeout(() => {
      if (activeDuels.has(duel.challenger)) resolveRound(duel, channel);
    }, 45000);
  }
}

async function sendStanceButtons(duel, channel) {
  const p1 = duel.players[duel.challenger];
  const p2 = duel.players[duel.opponent];

  const pendingEvents = [];
  activatePendingEffects(p1, pendingEvents);
  activatePendingEffects(p2, pendingEvents);
  if (pendingEvents.length) await channel.send(pendingEvents.join('\n'));

  duel.stanceCount = 0;
  p1.stance = null;
  p2.stance = null;

  if (isStunned(p1) && isStunned(p2)) {
    await channel.send(`⚡ Both players are stunned — turn skipped!`);
    await sendSpellChoices(duel, channel);
    return;
  }

  if (isStunned(p1)) {
    p1.stance = 'aggressive';
    duel.stanceCount++;
    await channel.send(`⚡ **${p1.username}** is stunned — **${p2.username}** picks stance freely!`);
  } else if (isStunned(p2)) {
    p2.stance = 'aggressive';
    duel.stanceCount++;
    await channel.send(`⚡ **${p2.username}** is stunned — **${p1.username}** picks stance freely!`);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`stance_${duel.challenger}_${duel.opponent}_aggressive`).setLabel('⚔️ Aggressive').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`stance_${duel.challenger}_${duel.opponent}_sneaky`).setLabel('🥷 Sneaky').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`stance_${duel.challenger}_${duel.opponent}_defensive`).setLabel('🛡️ Defensive').setStyle(ButtonStyle.Success),
  );

  const embed = new EmbedBuilder()
    .setColor('#2B2D31')
    .setTitle(`⚔️ Turn ${duel.turn} — Choose your stance`)
    .setDescription(`Choices are hidden until both players decide.`);

  duel.stanceMsg = await channel.send({ embeds: [embed], components: [row] });

  clearTimeout(duel.timer);
  duel.timer = setTimeout(async () => {
    if (!activeDuels.has(duel.challenger)) return;
    if (!p1.stance) p1.stance = 'aggressive';
    if (!p2.stance) p2.stance = 'aggressive';
    await sendSpellChoices(duel, channel);
  }, 45000);
}

function applyEffect(attacker, defender, effect, events) {
  if (!effect) return;

  const emoji = effectEmoji[effect.type] || '❓';

  if (effect.type === 'bleed' || effect.type === 'burn') {
    const existing = defender.activeEffects.find(e => e.type === effect.type);
    if (existing) {
      existing.duration = effect.duration;
      existing.value    = effect.value;
      existing.pending  = true;
      events.push(`${emoji} **${effect.type}** refreshed on **${defender.username}** — **${effect.value} HP**/turn for ${effect.duration} turns`);
    } else {
      defender.activeEffects.push({ type: effect.type, duration: effect.duration, value: effect.value, pending: true });
      events.push(`${emoji} **${defender.username}** — **${effect.type}** — **${effect.value} HP**/turn for ${effect.duration} turns *(next turn)*`);
    }
  }

  if (effect.type === 'stun') {
    const existing = defender.activeEffects.find(e => e.type === 'stun');
    if (!existing) {
      const pending = !!effect.nextTurn;
      defender.activeEffects.push({ type: 'stun', duration: effect.duration, value: 0, pending });
      events.push(pending
        ? `⚡ **${defender.username}** will be **stunned** next turn!`
        : `⚡ **${defender.username}** is **stunned** for ${effect.duration} turn(s)!`);
    }
  }

  if (effect.type === 'silence') {
    const existing = defender.activeEffects.find(e => e.type === 'silence');
    if (!existing) {
      defender.activeEffects.push({ type: 'silence', duration: effect.duration, value: 0 });
      events.push(`🔇 **${defender.username}** is **silenced** for ${effect.duration} turn(s)!`);
    }
  }

  if (effect.type === 'shield') {
    attacker.activeEffects.push({ type: 'shield', duration: effect.duration, value: effect.value });
    events.push(`🛡️ **${attacker.username}** — **shield** — absorbs **${effect.value} dmg** for ${effect.duration} turn(s)`);
  }

  if (effect.type === 'cleanse') {
    const negativeEffects = ['bleed', 'burn', 'stun', 'silence'];
    let removed = 0;
    const count = effect.count || 99;
    attacker.activeEffects = attacker.activeEffects.filter(e => {
      if (negativeEffects.includes(e.type) && removed < count) {
        removed++;
        return false;
      }
      return true;
    });
    events.push(`✨ **${attacker.username}** cleansed **${removed}** effect(s)`);
  }
}

function processActiveEffects(player, events, turn) {
  const toRemove = [];

  for (let i = 0; i < player.activeEffects.length; i++) {
    const eff = player.activeEffects[i];
    if (eff.pending) continue;

    if (eff.type === 'bleed' || eff.type === 'burn') {
      player.hp = Math.max(0, player.hp - eff.value);
      events.push(`${effectEmoji[eff.type]} **${player.username}** — **${eff.value} HP** from **${eff.type}** (${eff.duration - 1} left)`);
    }

    eff.duration--;
    if (eff.duration <= 0) toRemove.push(i);
  }

  for (let i = toRemove.length - 1; i >= 0; i--) {
    const eff = player.activeEffects[toRemove[i]];
    events.push(`💨 **${eff.type}** wore off — **${player.username}**`);
    player.activeEffects.splice(toRemove[i], 1);
  }
}

async function resolveRound(duel, channel) {
  const p1 = duel.players[duel.challenger];
  const p2 = duel.players[duel.opponent];

  const stanceWins = { aggressive: 'sneaky', sneaky: 'defensive', defensive: 'aggressive' };

  const events = [];

  let order;
  if (isStunned(p1) && !isStunned(p2)) {
    order = [{ attacker: p2, defender: p1 }];
  } else if (isStunned(p2) && !isStunned(p1)) {
    order = [{ attacker: p1, defender: p2 }];
  } else {
    let stanceWinner = null;
    if (p1.stance && p2.stance) {
      if (stanceWins[p1.stance] === p2.stance) stanceWinner = p1;
      else if (stanceWins[p2.stance] === p1.stance) stanceWinner = p2;
    }
    order = stanceWinner
      ? stanceWinner.id === duel.challenger
        ? [{ attacker: p1, defender: p2 }, { attacker: p2, defender: p1 }]
        : [{ attacker: p2, defender: p1 }, { attacker: p1, defender: p2 }]
      : [{ attacker: p1, defender: p2 }, { attacker: p2, defender: p1 }];
  }

  for (const { attacker, defender } of order) {
    const action = duel.actions[attacker.id];
    if (!action) {
      events.push(isStunned(attacker)
        ? `⚡ **${attacker.username}** is stunned — no action!`
        : `⏭️ **${attacker.username}** did not choose a spell!`);
      continue;
    }

    const spell  = action.spell;
    const stats  = spell.stats;
    const roll   = Math.random();

    if (roll > stats.accuracy / 100) {
      events.push(`❌ **${attacker.username}** cast **${spell.name}** — missed!`);
      continue;
    }

    const isCrit    = Math.random() < stats.critChance / 100;
    const wandBonus = await getWandBonus(attacker.id, spell.category);
    const hasBonus  = wandBonus > 1.0;

    if (stats.damage) {
      let dmg = Math.round(stats.damage * wandBonus * (isCrit ? 1.5 : 1));

      const shieldEffect = defender.activeEffects.find(e => e.type === 'shield');
      if (shieldEffect) {
        const absorbed = Math.min(shieldEffect.value, dmg);
        dmg -= absorbed;
        shieldEffect.value -= absorbed;
        if (shieldEffect.value <= 0) {
          defender.activeEffects = defender.activeEffects.filter(e => e.type !== 'shield');
          events.push(`🛡️ Shield absorbed **${absorbed} dmg** and broke!`);
        } else {
          events.push(`🛡️ Shield absorbed **${absorbed} dmg**`);
        }
      }

      defender.hp = Math.max(0, defender.hp - dmg);
      events.push(`${isCrit ? '💥 **CRIT!**  ' : ''}**${attacker.username}** → **${spell.name}** → **${defender.username}**  \`-${dmg} HP\`${hasBonus ? `  ✨ +${Math.round((wandBonus - 1) * 100)}%` : ''}`);
      if (stats.flavorText) {
        events.push(`> *${stats.flavorText}*`);
      }
    }

    if (stats.healing) {
      const heal = Math.round(stats.healing * wandBonus * (isCrit ? 1.5 : 1));
      attacker.hp = Math.min(250, attacker.hp + heal);
      events.push(`${isCrit ? '💚 **CRIT!**  ' : ''}**${attacker.username}** → **${spell.name}**  \`+${heal} HP\`${hasBonus ? `  ✨ +${Math.round((wandBonus - 1) * 100)}%` : ''}`);
      if (stats.flavorText) {
        events.push(`> *${stats.flavorText}*`);
      }
    }

    if (stats.effect) {
      applyEffect(attacker, defender, stats.effect, events);
    }

    attacker.mana = Math.max(0, attacker.mana - stats.mana);
    if (defender.hp <= 0) break;
  }

  processActiveEffects(p1, events, duel.turn);
  processActiveEffects(p2, events, duel.turn);

  p1.mana = Math.min(150, p1.mana + 10);
  p2.mana = Math.min(150, p2.mana + 10);

  if (p1.hp <= 0 || p2.hp <= 0) {
    const winner = p1.hp > 0 ? p1 : p2;
    const loser  = p1.hp > 0 ? p2 : p1;

    await UserStats.findOneAndUpdate({ userId: winner.id }, { $inc: { wins: 1 } });
    await UserStats.findOneAndUpdate({ userId: loser.id },  { $inc: { losses: 1 } });

    activeDuels.delete(duel.challenger);
    activeDuels.delete(duel.opponent);

    const { embed: endEmbed, attachment: endAttachment } = await buildEndEmbed(winner, loser, p1, p2, events);
return channel.send({ embeds: [endEmbed], files: [endAttachment] });
  }

  duel.turn++;
  duel.actions     = {};
  duel.stanceCount = 0;
  p1.stance        = null;
  p2.stance        = null;

  const { embed: roundEmbed, attachment: roundAttachment } = await buildRoundEmbed(duel, events);
await channel.send({ embeds: [roundEmbed], files: [roundAttachment] });
  await sendStanceButtons(duel, channel);
}

module.exports = {
  name: 'duel',
  activeDuels,

  async execute(message, args) {
    const challenger = message.author;
    const opponent   = message.mentions.users.first();

    if (!opponent)                      return message.reply('❌ لازم تمنشن حد! مثلاً: `!duel @user`');
    if (opponent.id === challenger.id)  return message.reply('❌ مش قادر تبارز نفسك!');
    if (opponent.bot)                   return message.reply('❌ مش قادر تبارز بوت!');
    if (activeDuels.has(challenger.id)) return message.reply('❌ انت في مبارزة خلاص!');
    if (activeDuels.has(opponent.id))   return message.reply('❌ الخصم في مبارزة خلاص!');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`accept_${challenger.id}_${opponent.id}`).setLabel('✅ Accept').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`decline_${challenger.id}_${opponent.id}`).setLabel('❌ Decline').setStyle(ButtonStyle.Danger),
    );

    const embed = new EmbedBuilder()
      .setColor('#2B2D31')
      .setTitle('⚔️ Duel Challenge!')
      .setDescription(`**${challenger.displayName || challenger.username}** challenged **${opponent.displayName || opponent.username}** to a magical duel!\n\nYou have 60 seconds to accept or decline.`);

    await message.channel.send({ content: `${opponent}`, embeds: [embed], components: [row] });

    const timeout = setTimeout(async () => {
      await message.channel.send(`⏰ **${opponent.displayName || opponent.username}** did not respond — duel cancelled.`);
      activeDuels.delete(`pending_${challenger.id}`);
    }, 60000);

    activeDuels.set(`pending_${challenger.id}`, { timeout, challenger, opponent, channel: message.channel });
  },

  async handleButton(interaction) {
    const parts = interaction.customId.split('_');

    if (parts[0] === 'accept' || parts[0] === 'decline') {
      const [action, challengerId, opponentId] = parts;
      const pending = activeDuels.get(`pending_${challengerId}`);

      if (!pending) return interaction.reply({ content: '❌ Challenge expired!', ephemeral: true });
      if (interaction.user.id !== opponentId) return interaction.reply({ content: '❌ This is not your challenge!', ephemeral: true });

      clearTimeout(pending.timeout);
      activeDuels.delete(`pending_${challengerId}`);

      if (action === 'decline') {
        await interaction.update({ components: [] });
        return pending.channel.send(`❌ **${pending.opponent.displayName || pending.opponent.username}** declined the duel.`);
      }

      const challengerMember = await pending.channel.guild.members.fetch(challengerId);
      const opponentMember   = await pending.channel.guild.members.fetch(opponentId);

      const duel = {
        challenger:   challengerId,
        opponent:     opponentId,
        turn:         1,
        actions:      {},
        stanceCount:  0,
        players: {
          [challengerId]: { id: challengerId, username: challengerMember.nickname || pending.challenger.username, hp: 250, mana: 150, stance: null, activeEffects: [] },
          [opponentId]:   { id: opponentId,   username: opponentMember.nickname   || pending.opponent.username,   hp: 250, mana: 150, stance: null, activeEffects: [] },
        },
      };

      activeDuels.set(challengerId, duel);
      activeDuels.set(opponentId,   duel);

      await interaction.update({ components: [] });
      const { embed: statusEmbed, attachment: statusAttachment } = await buildStatusEmbed(duel);
await pending.channel.send({ embeds: [statusEmbed], files: [statusAttachment] });
      await sendStanceButtons(duel, pending.channel);
      return;
    }

    if (parts[0] === 'stance') {
      const [, challengerId, opponentId, stance] = parts;
      const duel = activeDuels.get(interaction.user.id);

      if (!duel) return interaction.reply({ content: '❌ You are not in a duel!', ephemeral: true });
      if (interaction.user.id !== challengerId && interaction.user.id !== opponentId)
        return interaction.reply({ content: '❌ You are not in this duel!', ephemeral: true });

      const player = duel.players[interaction.user.id];
      if (player.stance) return interaction.reply({ content: '✅ You already chose your stance!', ephemeral: true });
      if (isStunned(player)) return interaction.reply({ content: '⚡ You are stunned and cannot choose!', ephemeral: true });

      player.stance = stance;
      duel.stanceCount++;

      await interaction.reply({ content: `✅ Stance locked: **${stance}** — waiting for opponent...`, ephemeral: true });

      const p1 = duel.players[challengerId];
      const p2 = duel.players[opponentId];
      const stancesNeeded = (isStunned(p1) || isStunned(p2)) ? 1 : 2;

      if (duel.stanceCount >= stancesNeeded) {
        clearTimeout(duel.timer);

        const stanceWins  = { aggressive: 'sneaky', sneaky: 'defensive', defensive: 'aggressive' };
        const stanceEmoji = { aggressive: '⚔️', sneaky: '🥷', defensive: '🛡️' };

        if (p1.stance === p2.stance && !isStunned(p1) && !isStunned(p2)) {
          p1.stance        = null;
          p2.stance        = null;
          duel.stanceCount = 0;

          await duel.stanceMsg.edit({ components: [] });
          await interaction.channel.send(`🔄 Both chose **${stanceEmoji[stance]} ${stance}** — pick again!`);
          await sendStanceButtons(duel, interaction.channel);
          return;
        }

        let stanceResult = '';
        if (isStunned(p1) && !isStunned(p2)) {
          stanceResult = `⚡ **${p1.username}** is stunned! **${p2.username}** chose ${stanceEmoji[p2.stance]} ${p2.stance} freely.`;
        } else if (isStunned(p2) && !isStunned(p1)) {
          stanceResult = `⚡ **${p2.username}** is stunned! **${p1.username}** chose ${stanceEmoji[p1.stance]} ${p1.stance} freely.`;
        } else if (stanceWins[p1.stance] === p2.stance) {
          stanceResult = `🏆 **${p1.username}** wins the stance! ${stanceEmoji[p1.stance]} ${p1.stance} beats ${stanceEmoji[p2.stance]} ${p2.stance}`;
        } else if (stanceWins[p2.stance] === p1.stance) {
          stanceResult = `🏆 **${p2.username}** wins the stance! ${stanceEmoji[p2.stance]} ${p2.stance} beats ${stanceEmoji[p1.stance]} ${p1.stance}`;
        } else {
          stanceResult = `🤝 Tie! ${stanceEmoji[p1.stance]} ${p1.stance} vs ${stanceEmoji[p2.stance]} ${p2.stance}`;
        }

        await duel.stanceMsg.edit({ components: [] });
        await interaction.channel.send(stanceResult);
        await sendSpellChoices(duel, interaction.channel);
      }
      return;
    }

    if (parts[0] === 'cast') {
      const [, playerId, ...spellParts] = parts;
      const spellName = spellParts.join('_');
      const duel = activeDuels.get(interaction.user.id);

      if (!duel) return interaction.reply({ content: '❌ You are not in a duel!', ephemeral: true });
      if (interaction.user.id !== playerId) return interaction.reply({ content: '❌ Not your turn!', ephemeral: true });
      if (duel.actions[playerId] !== undefined) return interaction.reply({ content: '✅ Spell already chosen!', ephemeral: true });

      const userSpells = await getUserSpells(playerId);
      const spell = userSpells.find(s => s.name === spellName);

      if (!spell) return interaction.reply({ content: '❌ Spell not available!', ephemeral: true });

      const player = duel.players[playerId];
      if (isStunned(player)) return interaction.reply({ content: '⚡ You are stunned!', ephemeral: true });
      if (player.mana < spell.stats.mana) {
        return interaction.reply({ content: `❌ Not enough mana! Need ${spell.stats.mana}, have ${player.mana}`, ephemeral: true });
      }

      duel.actions[playerId] = { spell };
      await interaction.reply({ content: `✅ **${spell.name}** locked in — waiting for opponent...`, ephemeral: true });

      const otherId    = playerId === duel.challenger ? duel.opponent : duel.challenger;
      const otherReady = duel.actions[otherId] !== undefined;

      if (otherReady) {
        clearTimeout(duel.timer);
        resolveRound(duel, interaction.channel);
      }
    }
  },
};