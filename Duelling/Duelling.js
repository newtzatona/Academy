const fs = require('fs');
const path = require('path');
const {
    Client,
    Partials,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} = require('discord.js');
const spells = require('./spells');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim();
        if (key && process.env[key] === undefined) process.env[key] = value;
    }
}

const findSpell = (rawName) => {
    if (!rawName) return null;
    const normalized = rawName.toLowerCase();
    for (const category of Object.keys(spells)) {
        const key = Object.keys(spells[category]).find(
            (name) => name.toLowerCase() === normalized
        );
        if (key) {
            const base = spells[category][key];
            return {
                category,
                name: key,
                data: {
                    mpCost: base.mpCost,
                    effect: { ...base.effect },
                },
            };
        }
    }
    return null;
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember,
        Partials.Reaction,
        Partials.GuildScheduledEvent,
        Partials.User,
        Partials.ThreadMember
    ],
    shards: "auto",
    allowedMentions: {
        parse: [],
        repliedUser: false
    },
});

const prefix = '!';
let players = {};
let currentPlayer = null;
let lastSpell = null;
let round = 0;
let judge = null;
let exhaustionCounter = {};
let rpsPhase = null;

const RPS_LOGO = 'https://itzmaximee.github.io/iMGN-Duelling-Club/logo.png';

const getRpsWinner = (choice1, choice2) => {
    if (choice1 === choice2) return null;
    if (
        (choice1 === 'rock' && choice2 === 'scissors') ||
        (choice1 === 'paper' && choice2 === 'rock') ||
        (choice1 === 'scissors' && choice2 === 'paper')
    ) {
        return 1;
    }
    return 2;
};

const buildRpsButtons = (disabled = false) =>
    new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('rps_rock')
            .setLabel('Rock')
            .setEmoji('🪨')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('rps_paper')
            .setLabel('Paper')
            .setEmoji('📄')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('rps_scissors')
            .setLabel('Scissors')
            .setEmoji('✂️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    );

const getRpsLockedCount = (phase) =>
    [phase.player1Id, phase.player2Id].filter((id) => phase.choices[id]).length;

const buildRpsEmbed = (phase, statusLine) =>
    new EmbedBuilder()
        .setTitle('Rock · Paper · Scissors')
        .setColor('#fbe474')
        .setThumbnail(RPS_LOGO)
        .setDescription(
            `**${phase.player1Name}** vs **${phase.player2Name}**\n\n` +
            `Duelists — click **Rock**, **Paper**, or **Scissors** below.\n` +
            `Your pick stays private until both players have chosen.\n\n` +
            statusLine
        )
        .setFooter({ text: 'Duelling Club' });

const getRpsMessage = async (phase) => {
    if (!phase?.messageId || !phase?.channelId) return null;
    const channel = await client.channels.fetch(phase.channelId).catch(() => null);
    if (!channel?.isTextBased()) return null;
    return channel.messages.fetch(phase.messageId).catch(() => null);
};

const updateRpsEmbed = async (phase) => {
    const msg = await getRpsMessage(phase);
    if (!msg) return;
    const locked = getRpsLockedCount(phase);
    await msg.edit({
        embeds: [
            buildRpsEmbed(phase, `**Locked in:** ${locked}/2`),
        ],
        components: [buildRpsButtons(false)],
    });
};

const disableRpsButtons = async (phase = rpsPhase) => {
    const msg = await getRpsMessage(phase);
    if (!msg) return;
    await msg.edit({ components: [buildRpsButtons(true)] });
};

const resolveRps = async (phase) => {
    const c1 = phase.choices[phase.player1Id];
    const c2 = phase.choices[phase.player2Id];
    const msg = await getRpsMessage(phase);

    if (c1 === c2) {
        phase.choices = {};
        phase.resolving = false;
        if (msg) {
            await msg.edit({
                embeds: [
                    buildRpsEmbed(
                        phase,
                        `Both players picked the same — **tie**! Choose again.\n\n**Locked in:** 0/2`
                    ),
                ],
                components: [buildRpsButtons(false)],
            });
        }
        return;
    }

    const winnerSide = getRpsWinner(c1, c2);
    const winnerName = winnerSide === 1 ? phase.player1Name : phase.player2Name;
    const winnerUsername = winnerSide === 1 ? phase.player1 : phase.player2;

    currentPlayer = winnerUsername;
    rpsPhase = null;

    const resultText =
        `**${phase.player1Name}** chose **${c1}**, **${phase.player2Name}** chose **${c2}**. ` +
        `**${winnerName}** wins rock-paper-scissors and goes first!`;

    const channel =
        msg?.channel ??
        (await client.channels.fetch(phase.channelId).catch(() => null));
    if (channel?.isTextBased()) {
        await channel.send(resultText);
    }

    if (msg) {
        await msg.edit({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Rock · Paper · Scissors — Result')
                    .setColor('#fbe474')
                    .setThumbnail(RPS_LOGO)
                    .setDescription(
                        `**${phase.player1Name}** chose **${c1}**.\n` +
                        `**${phase.player2Name}** chose **${c2}**.\n\n` +
                        `**${winnerName}** goes first!\n` +
                        `Cast a spell by typing its name.`
                    )
                    .setFooter({ text: 'Duelling Club' }),
            ],
            components: [buildRpsButtons(true)],
        });
    }
};

const processRpsChoice = async (interaction, choice) => {
    const phase = rpsPhase;
    if (!phase) {
        return interaction.reply({
            content: 'This rock-paper-scissors round is no longer active.',
            flags: MessageFlags.Ephemeral,
        });
    }

    const userId = interaction.user.id;
    const isDuelist = userId === phase.player1Id || userId === phase.player2Id;

    if (!isDuelist) {
        return interaction.reply({
            content: 'Only the two duelists can choose.',
            flags: MessageFlags.Ephemeral,
        });
    }

    if (phase.choices[userId]) {
        return interaction.reply({
            content: 'You already locked in your choice. Wait for your opponent.',
            flags: MessageFlags.Ephemeral,
        });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    phase.choices[userId] = choice;
    await interaction.editReply({
        content: 'Your choice is locked in. Only you can see this — everyone else waits for the result.',
    });

    await updateRpsEmbed(phase);

    const locked = getRpsLockedCount(phase);
    if (locked < 2) return;

    if (phase.resolving) return;
    phase.resolving = true;

    try {
        await resolveRps(phase);
    } catch (err) {
        console.error('RPS resolve error:', err);
        phase.resolving = false;
        await interaction.followUp({
            content: 'Something went wrong revealing the result. Ask the judge to run `!end` and `!start` again.',
            flags: MessageFlags.Ephemeral,
        });
    }
};

const resetDuel = () => {
    players = {};
    currentPlayer = null;
    lastSpell = null;
    round = 0;
    exhaustionCounter = {};
    rpsPhase = null;
};

const applyEffects = (player, opponent, effect) => {
    if (effect.heal) player.hp += effect.heal;

    if (effect.mp && effect.mp > 0) player.mp += effect.mp;
    if (effect.hp && effect.hp > 0) player.hp += effect.hp;
    
    if (effect.mp && effect.mp < 0) opponent.mp += effect.mp;
    if (effect.hp && effect.hp < 0) {
        if (opponent.attackReduce) {
            opponent.hp += effect.hp * 0.5;
            opponent.attackReduce = null;
        } else {
            opponent.hp += effect.hp;
        }
    }

    if (effect.attackBlock) {
        opponent.attackDisable = (opponent.attackDisable || 0) + effect.attackBlock;
    }
    if (effect.defenseBlock) {
        opponent.blockDisable = (opponent.blockDisable || 0) + effect.defenseBlock;
    }

    if (effect.statusCure) {
        player.bleeds = []
        let randomIndex = Math.floor(Math.random() * players.bleeds?.length) || 0;
        let removedstatus = player.bleeds.splice(randomIndex, 1)[0];
    }


    // Apply specific spell effects
    if (effect.bleed) {
        let bleed = {}
        bleed.turns = effect.bleedTurns
        bleed.damage = effect.bleed
        if (!opponent.bleeds) opponent.bleeds = []
        opponent.bleeds.push(bleed);
    }
    /*
    if (effect.burn) {
        let burn = {}
        burn.turns = effect.burnTurns
        burn.damage = effect.burn
        if (!opponent.burns) opponent.burns = []
        opponent.burns.push(burn);
    }
    */
    
    if (effect.skip) {
        opponent.stunned += effect.skip;
    }
    if (effect.immobilize) {
        opponent.stunned += effect.immobilize
    }
    
    if (effect.block) {
        player.hp += effect.block
    }
    if (effect.accuracyReduce) {
        opponent.accuracyReduced = effect.accuracyReduce;
    }
    if (effect.attackReduce) {
        opponent.attackReduce = effect.attackReduce;
    }
    if (effect.statusReduce) {
        player.statusReduce = effect.statusReduce;
    }

    if (effect.attackDisable) {
        opponent.attackDisable = effect.attackDisable;
    }
    if (effect.healDisable) {
        opponent.healDisable = effect.healDisable;
    }
    if (effect.statusBlock) {
        player.statusBlock = effect.statusBlock;
    }
    if (effect.blockDisable) {
        opponent.blockDisable = effect.blockDisable;
    }

    if (effect.damageIncrease) {
        player.damageIncrease = effect.damageIncrease;
    }
      
};

const applyOngoingEffects = (player) => {
    let totalDamage = 0;

    if (player.bleeds) {
        console.log('status condition', player.bleeds)
        player.bleeds.forEach(bleed => {
            if (bleed.turns > 0 && player.statusReduce) {
                player.hp -= (bleed.damage * 0.5);
                bleed.turns -= 1;
                totalDamage += (bleed.damage * 0.5);
            } else {
                player.hp -= bleed.damage;
                bleed.turns -= 1;
                totalDamage += bleed.damage;
            }
        });
        player.bleeds = player.bleeds.filter(bleed => bleed.turns > 0)
    }    
    return totalDamage;
};

client.once('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || !interaction.customId.startsWith('rps_')) return;

    const choice = interaction.customId.replace('rps_', '');
    if (!['rock', 'paper', 'scissors'].includes(choice)) return;

    try {
        await processRpsChoice(interaction, choice);
    } catch (err) {
        console.error('RPS button error:', err);
        const payload = {
            content: 'Could not register your choice. Try again or ask the judge to restart with `!start`.',
            flags: MessageFlags.Ephemeral,
        };
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(payload).catch(() => null);
        } else {
            await interaction.reply(payload).catch(() => null);
        }
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const args = message.content.trim().split(/ +/);
    const firstArg = args.shift();
    const command = firstArg.toLowerCase();

    if (command === `${prefix}setjudge`) {
        if (message.mentions.users.size !== 1) {
            return message.channel.send('Please mention exactly one user to set as the judge.');
        }

        judge = message.mentions.users.first();
        return message.channel.send(`The judge for this duel is ${judge.username}. They can start the duel with \`!start\` or end it early with \`!end\`.`);
    }

    if (message.content.startsWith('!spells')) {
        const args = message.content.split(' ').slice(1);
        const category = args[0];

        const categoryKey = category && Object.keys(spells).find(
            (key) => key.toLowerCase() === category.toLowerCase()
        );
        if (!categoryKey || !spells[categoryKey]) {
            return message.reply(`Please specify a valid category: ${Object.keys(spells).join(', ')}.`);
        }

        const spellList = spells[categoryKey];
        const embed = new EmbedBuilder()
            .setTitle(`${categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)} Spells`)
            .setThumbnail(`https://itzmaximee.github.io/iMGN-Duelling-Club/logo.png`)
            .setColor('#fbe474');

        for (const [spellName, spellDetails] of Object.entries(spellList)) {
            embed.addFields({
                name: spellName,
                value: `**MP Cost:** ${spellDetails.mpCost}\n**Effect:** ${spellDetails.effect.text}`,
                inline: false
            });
        }

        message.channel.send({ embeds: [embed] });
    }

    if (command === `${prefix}start` && message.author.id === judge?.id) {
        if (message.mentions.users.size !== 2) {
            return message.channel.send('Please mention exactly two players to start the duel.');
        }
        const [player1, player2] = [...message.mentions.users.values()];
        if (player1.id === player2.id) {
            return message.channel.send('Please mention two different players.');
        }

        players = {};
        players[player1.username] = { hp: 150, mp: 150, bleed: 0, burn: 0, stunned: 0, block: false, lastspells: [] };
        players[player2.username] = { hp: 150, mp: 150, bleed: 0, burn: 0, stunned: 0, block: false, lastspells: [] };
        currentPlayer = null;
        exhaustionCounter[player1.username] = 0;
        exhaustionCounter[player2.username] = 0;
        round = 0;
        rpsPhase = {
            player1: player1.username,
            player2: player2.username,
            player1Name: player1.displayName || player1.username,
            player2Name: player2.displayName || player2.username,
            player1Id: player1.id,
            player2Id: player2.id,
            channelId: message.channel.id,
            choices: {},
            resolving: false,
        };

        const rpsMessage = await message.channel.send({
            content: `**${rpsPhase.player1Name}** and **${rpsPhase.player2Name}** — use the buttons below to decide who goes first.`,
            embeds: [buildRpsEmbed(rpsPhase, '**Locked in:** 0/2')],
            components: [buildRpsButtons(false)],
        });
        rpsPhase.messageId = rpsMessage.id;
    }

    if (command === `${prefix}end`) {
        if (!judge) {
            return message.channel.send('No judge set. Use !setjudge first.');
        }
        if (message.author.id !== judge.id) {
            return message.channel.send('Only the judge can end the duel.');
        }
        const duelists = Object.keys(players);
        if (duelists.length < 2 && !rpsPhase) {
            return message.channel.send('No duel is in progress.');
        }
        if (rpsPhase && !currentPlayer) {
            await disableRpsButtons();
            resetDuel();
            return message.channel.send('The duel setup was cancelled by the judge.');
        }
        const [p1, p2] = duelists;
        let resultText;
        if (players[p1].hp === players[p2].hp) {
            resultText = `The duel was ended by the judge. It's a draw (${p1} and ${p2} both at ${players[p1].hp} HP).`;
        } else {
            const winner = players[p1].hp > players[p2].hp ? p1 : p2;
            const loser = winner === p1 ? p2 : p1;
            resultText = `The duel was ended by the judge. **${winner}** wins (${players[winner].hp} HP vs ${players[loser].hp} HP).`;
        }
        resetDuel();
        return message.channel.send(resultText);
    }

    if (players[message.author.username] && message.author.username === currentPlayer) {
        const found = findSpell(firstArg);
        if (!found) {
            return message.channel.send('Invalid spell. Cast a spell by typing its name (e.g. Depulso).');
        }

        const spellName = found.name;
        const spellCategory = found.category;
        const spellData = found.data;
        const opponent = Object.keys(players).find((player) => player !== currentPlayer);

        if (['attacking', 'darkArts', 'transfiguration'].includes(spellCategory)) {
            const unavailableSpell = players[currentPlayer].lastspells.find(spell => spell.name == spellName)
            if (unavailableSpell) return message.reply(`You cannot perform this spell before ${unavailableSpell.Remaining} turns`)
        }

        if ((players[currentPlayer].attackDisable && players[currentPlayer].attackDisable > 0) && ['attacking', 'darkArts', 'transfiguration'].includes(spellCategory)) {
            message.channel.send("You cannot perform this attacking spell");
            return;
        } else if ((players[currentPlayer].attackDisable && players[currentPlayer].attackDisable > 0) && !(['attacking', 'darkArts', 'transfiguration'].includes(spellCategory))) {
            players[currentPlayer].attackDisable--
        }

        if ((players[currentPlayer].blockDisable && players[currentPlayer].blockDisable > 0) && ['defense', 'healing'].includes(spellCategory)) {
            message.channel.send("You cannot perform this defense spell");
            return;
        } else if ((players[currentPlayer].blockDisable && players[currentPlayer].blockDisable > 0) && !['defense', 'healing'].includes(spellCategory)) {
            players[currentPlayer].blockDisable--
        }
        
        if ((players[currentPlayer].healDisable && players[currentPlayer].healDisable > 0) && ['healing'].includes(spellCategory)) {
            message.channel.send("You cannot perform this defense spell");
            return;
        } else if ((players[currentPlayer].healDisable && players[currentPlayer].healDisable > 0) && !['healing'].includes(spellCategory)) {
            players[currentPlayer].healDisable--
        }

        
        if (spellCategory === 'defense') {
            const lastHit = players[opponent]?.lastSpell?.effect?.hp;
            if (lastHit === undefined || lastHit >= 0) {
                return message.reply('You cannot use a defensive spell if you were not damaged on the last attack.');
            }
        }


        players[currentPlayer].lastspells.forEach(spell => {
            spell.Remaining -= 1;
        });
        players[currentPlayer].lastspells = players[currentPlayer].lastspells.filter(spell => spell.Remaining > 0)

        if (['attacking', 'darkArts', 'transfiguration'].includes(spellCategory)) {
            players[currentPlayer].lastspells.push({name: spellName, Remaining: 3})
        }

        
        const statusEffects = ['bleed', 'immobilize']
        
        if (players[currentPlayer].statusBlock && players[currentPlayer].statusBlock > 0) {
            const effectsKeys = Object.keys(spellData.effect);
            const matchingKeys = statusEffects.filter((effect) => effectsKeys.includes(effect));
            if (matchingKeys.length > 0) {
                players[currentPlayer].statusBlock--;
                spellData.effect[matchingKeys[0]] = 0;
                if (matchingKeys[0] === 'immobilize') {
                    spellData.effect.skip = 0;
                }
            }
        }

        if (players[currentPlayer].damageIncrease && spellData.effect.hp < 0) {
            spellData.effect.hp += Math.round(spellData.effect.hp * 0.25);
            players[currentPlayer].damageIncrease = null;
        }

        if (players[currentPlayer].accuracyReduced) {
            if (Math.random() > 0.5) {
                currentPlayer = opponent;
                round++
                message.channel.send(`Spell Failed now it's ${opponent} turn`);
                if (round > 30) {
                    const [p1, p2] = Object.keys(players);
                    const winner = players[p1].hp >= players[p2].hp ? p1 : p2;
                    players = {};
                    currentPlayer = null;
                    return message.channel.send(`The duel has ended after 30 rounds! ${winner} wins with more HP.`);
                }
                players[currentPlayer].accuracyReduced = null
                return;
            } else {
                players[currentPlayer].accuracyReduced = null
            }
        }
        
        if (players[currentPlayer].mp < spellData.mpCost) {
            return message.channel.send('Not enough MP to cast this spell.');
        }
        
        players[currentPlayer].mp -= spellData.mpCost;

        // Apply effects from the spell
        applyEffects(players[currentPlayer], players[opponent], spellData.effect);

        // console.log('player effect', players[opponent])

        // Process ongoing effects on the opponent
        applyOngoingEffects(players[opponent]);
        applyOngoingEffects(players[currentPlayer]);
        // console.log('player oneffect', players[opponent])
        if (players[currentPlayer].hp > 150) players[currentPlayer].hp = 150
        if (players[currentPlayer].mp > 150) players[currentPlayer].mp = 150
        if (players[opponent].hp > 150) players[opponent].hp = 150
        if (players[opponent].mp > 150) players[opponent].mp = 150

        // Check if the opponent is still alive
        if (players[opponent].hp <= 0) {
            return message.channel.send(`${opponent} has been defeated! ${currentPlayer} wins!`);
        }

        // Check if the current player is out of MP and apply exhaustion
        if (players[currentPlayer].mp <= 0) {
            exhaustionCounter[currentPlayer]++;
        } else {
            exhaustionCounter[currentPlayer] = 0;
        }

        if (exhaustionCounter[currentPlayer] > 0) {
            return message.channel.send(`${currentPlayer} has exhausted their magic and has lost the duel due to magical fatigue! ${opponent} wins!`);
        }

        players[currentPlayer].lastSpell = spellData
        players[currentPlayer].lastSpell.category = spellCategory
        lastSpell = spellData
        lastSpell.category = spellCategory

        // Display status after each round
        const statusMessage = `
**${currentPlayer}** - HP: ${players[currentPlayer].hp}, MP: ${players[currentPlayer].mp}, Status: ${players[currentPlayer].status || 'None'}
**${opponent}** - HP: ${players[opponent].hp}, MP: ${players[opponent].mp}, Status: ${players[opponent].status || 'None'}
        `;
        const spellEmbed = new EmbedBuilder()
            .setColor('#fbe474')
            .setTitle(`${spellName}`)
            .setThumbnail(`https://itzmaximee.github.io/iMGN-Duelling-Club/logo.png`)
            .addFields(
                { name: 'MP Cost', value: `${spellData.mpCost}`, inline: true },
                { name: 'HP Effect', value: `${spellData.effect.hp ?? 0}`, inline: true },
                { name: 'MP Effect', value: `${spellData.effect.mp ?? 0}`, inline: true },
                { name: 'Additional Effects', value: `${spellData.effect.text}`, inline: false }
            )
            .setFooter({ text: 'Duelling Club', iconURL: 'https://itzmaximee.github.io/iMGN-Duelling-Club/logo.png' });
        

        const generateEmbed = (player) => {
            let mappedStatus
    
            if (player.bleeds) {
                mappedStatus = player.bleeds.map((bleed, index) => {
                    return `\n*HP Damage:* ${bleed.damage}\n*Remaining Turns:* ${bleed.turns}`;
                }).join('\n\n');
            } else {
                mappedStatus = `No Status`
            }
            return mappedStatus;
        }
        const playersEmbed = new EmbedBuilder()
            .setColor('#fbe474')
            .setTitle(`Players Status`)
            .setThumbnail(`https://itzmaximee.github.io/iMGN-Duelling-Club/logo.png`)
            .addFields(
                { name: currentPlayer, value: `**HP:** ${players[currentPlayer].hp}\n**MP:** ${players[currentPlayer].mp}\n**Immobilized Turns:** ${players[currentPlayer].stunned}\n**Status:** ${generateEmbed(players[currentPlayer])}`, inline: true },
                { name: opponent, value: `**HP:** ${players[opponent].hp}\n**MP:** ${players[opponent].mp}\n**Immobilized Turns:** ${players[opponent].stunned}\n**Status:** ${generateEmbed(players[opponent])}`, inline: true }
            )
            .setFooter({ text: 'Duelling Club', iconURL: 'https://itzmaximee.github.io/iMGN-Duelling-Club/logo.png' });
        message.reply({ embeds: [spellEmbed] })
        message.channel.send({ embeds: [playersEmbed] });

        // Switch players
        if (!players[opponent].stunned || players[opponent].stunned <= 0) {
            currentPlayer = opponent;
        } else {
            players[opponent].stunned -= 1;
        }
        round++;

        
        // Check for the end of the match after 30 rounds
        console.log(round)
        if (round >= 30) {
            const winner = players[currentPlayer].hp >= players[opponent].hp ? currentPlayer : opponent;
            players = {};
            currentPlayer = null;
            return message.channel.send(`The duel has ended after 30 rounds! ${winner} wins with more HP.`);
        }

    }
});

const normalizeToken = (value) => {
    if (!value) return '';
    return value.trim().replace(/^["']|["']$/g, '');
};

const token = normalizeToken(process.env.DISCORD_TOKEN);
if (!token) {
    console.error('Missing DISCORD_TOKEN. Set it in your environment or in a .env file.');
    process.exit(1);
}

client.login(token).catch((err) => {
    if (err.code === 'TokenInvalid') {
        console.error('Invalid Discord bot token.');
        console.error('Open https://discord.com/developers/applications → your bot → Bot → Reset Token.');
        console.error('Copy the new token into .env as DISCORD_TOKEN=your_token_here');
    } else {
        console.error('Login failed:', err.message);
    }
    process.exit(1);
});