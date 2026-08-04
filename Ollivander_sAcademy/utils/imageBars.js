const { createCanvas } = require('canvas');
const { AttachmentBuilder } = require('discord.js');

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function getHpColor(pct) {
  if (pct > 0.6) return '#4ade80';
  if (pct > 0.3) return '#facc15';
  return '#ef4444';
}

function drawInlineBar(ctx, x, y, width, height, pct, fillColor, text) {
  const radius = height / 2;

  ctx.fillStyle = '#2a2a32';
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();

  const clampedPct = Math.max(0, Math.min(1, pct));
  if (clampedPct > 0) {
    ctx.save();
    roundRect(ctx, x, y, width, height, radius);
    ctx.clip();
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, width * clampedPct, height);
    ctx.restore();
  }

  ctx.strokeStyle = '#13131a';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, width, height, radius);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(height * 0.5)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 3;
  ctx.fillText(text, x + width / 2, y + height / 2 + 1);
  ctx.shadowBlur = 0;
}

function drawBar({
  current,
  max,
  width = 400,
  height = 40,
  fillColor = '#4ade80',
  bgColor = '#2a2a32',
  borderColor = '#1a1a1f',
  label = '',
}) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const radius = height / 2;

  ctx.fillStyle = bgColor;
  roundRect(ctx, 0, 0, width, height, radius);
  ctx.fill();

  const pct = Math.max(0, Math.min(1, current / max));
  const actualFillWidth = width * pct;

  if (pct > 0) {
    ctx.save();
    roundRect(ctx, 0, 0, width, height, radius);
    ctx.clip();
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, actualFillWidth, height);
    ctx.restore();
  }

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  roundRect(ctx, 1, 1, width - 2, height - 2, radius);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.fillText(`${label}${current} / ${max}`, width / 2, height / 2 + 1);

  return canvas;
}

async function createHpBarAttachment(current, max, filename = 'hpbar.png') {
  const pct = current / max;
  const canvas = drawBar({
    current,
    max,
    fillColor: getHpColor(pct),
    label: '❤️ ',
  });
  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: filename });
}

async function createManaBarAttachment(current, max, filename = 'manabar.png') {
  const canvas = drawBar({
    current,
    max,
    fillColor: '#60a5fa',
    label: '🔮 ',
  });
  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: filename });
}

function createDuelStatusImage({ p1, p2, width = 700, height = 220 }) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1c1c22';
  roundRect(ctx, 0, 0, width, height, 16);
  ctx.fill();

  const colWidth = width / 2 - 30;
  const barWidth = colWidth - 20;
  const barHeight = 32;
  const manaBarHeight = 20;

  function drawPlayerColumn(player, x) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(player.username, x, 36);

    const hpPct = player.hp / 250;
    drawInlineBar(ctx, x, 50, barWidth, barHeight, hpPct, getHpColor(hpPct), `❤️ ${player.hp} / 250`);

    const manaPct = player.mana / 150;
    drawInlineBar(ctx, x, 95, barWidth, manaBarHeight, manaPct, '#60a5fa', `🔮 ${player.mana} / 150`);

    if (player.activeEffects && player.activeEffects.length) {
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#d1d5db';
      const effText = player.activeEffects.map(e => `${e.type}·${e.duration}t`).join('  ');
      ctx.fillText(effText, x, 135);
    }
  }

  drawPlayerColumn(p1, 20);
  drawPlayerColumn(p2, width / 2 + 10);

  ctx.strokeStyle = '#33333d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2, 20);
  ctx.lineTo(width / 2, height - 20);
  ctx.stroke();

  return canvas;
}

async function createDuelStatusAttachment(p1, p2, filename = 'duelstatus.png') {
  const canvas = createDuelStatusImage({ p1, p2 });
  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: filename });
}

function createTrainCardImage({
  username,
  spellName,
  spellEmoji,
  stance,
  stanceEmoji,
  level,
  damage,
  accuracy,
  critChance,
  mana,
  category,
  earnedXP,
  spellCurrent,
  spellMax,
  spellColor,
  rankNum,
  rankCurrent,
  rankMax,
  width = 560,
}) {
  const height = 320;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1c1c22';
  roundRect(ctx, 0, 0, width, height, 18);
  ctx.fill();

  let y = 34;

  ctx.fillStyle = '#9ca3af';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(username, 24, y);

  y += 30;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`${spellEmoji} ${spellName}`, 24, y);

  ctx.font = '20px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('⭐'.repeat(level) + '☆'.repeat(5 - level), width - 24, y);
  ctx.textAlign = 'left';

  y += 26;

  ctx.fillStyle = '#9ca3af';
  ctx.font = '15px sans-serif';
  ctx.fillText(`${stanceEmoji} Stance: ${stance}  ·  Category: ${category}`, 24, y);

  ctx.fillStyle = '#a78bfa';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`+${earnedXP} XP`, width - 24, y);
  ctx.textAlign = 'left';

  y += 24;

  ctx.strokeStyle = '#2e2e36';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(24, y);
  ctx.lineTo(width - 24, y);
  ctx.stroke();

  y += 26;

  const stats = [
    { label: 'DMG', value: damage, color: '#f87171' },
    { label: 'ACC', value: `${accuracy}%`, color: '#60a5fa' },
    { label: 'CRIT', value: `${critChance}%`, color: '#facc15' },
    { label: 'MANA', value: mana, color: '#c084fc' },
  ];

  const statColWidth = (width - 48) / 4;
  stats.forEach((stat, i) => {
    const sx = 24 + i * statColWidth + statColWidth / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.fillText(stat.label, sx, y);
    ctx.fillStyle = stat.color;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`${stat.value}`, sx, y + 26);
  });
  ctx.textAlign = 'left';

  y += 56;

  const barWidth = width - 48;
  const barHeight = 36;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('SPELL PROGRESS', 24, y);
  y += 10;
  const spellPct = spellMax ? spellCurrent / spellMax : 1;
  drawInlineBar(ctx, 24, y, barWidth, barHeight, spellPct, spellColor, spellMax ? `${spellCurrent} / ${spellMax}` : '⭐ MAX');

  return canvas;
}

async function createTrainCardAttachment(params, filename = 'traincard.png') {
  const canvas = createTrainCardImage(params);
  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: filename });
}

function createRankCardImage({
  username,
  rank,
  totalXP,
  rankXPCurrent,
  rankXPNeeded,
  wins,
  losses,
  serverPosition,
  serverTotal,
  width = 560,
}) {
  const height = 320;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1c1c22';
  roundRect(ctx, 0, 0, width, height, 18);
  ctx.fill();

  let y = 34;

  ctx.fillStyle = '#9ca3af';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(username, 24, y);

  y += 30;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`🏆 Level ${rank}`, 24, y);

  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(serverPosition ? `#${serverPosition} في السيرفر` : '—', width - 24, y);
  ctx.textAlign = 'left';

  y += 26;

  ctx.fillStyle = '#9ca3af';
  ctx.font = '15px sans-serif';
  ctx.fillText('ساحر من أكاديمية أوليفاندرز', 24, y);

  ctx.fillStyle = '#a78bfa';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`⚡ ${totalXP} XP`, width - 24, y);
  ctx.textAlign = 'left';

  y += 24;

  ctx.strokeStyle = '#2e2e36';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(24, y);
  ctx.lineTo(width - 24, y);
  ctx.stroke();

  y += 26;

  const total   = (wins || 0) + (losses || 0);
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const stats = [
    { label: 'WINS',     value: wins || 0,        color: '#4ade80' },
    { label: 'LOSSES',   value: losses || 0,       color: '#f87171' },
    { label: 'WIN RATE', value: `${winRate}%`,     color: '#60a5fa' },
  ];

  const statColWidth = (width - 48) / 3;
  stats.forEach((stat, i) => {
    const sx = 24 + i * statColWidth + statColWidth / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.fillText(stat.label, sx, y);
    ctx.fillStyle = stat.color;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`${stat.value}`, sx, y + 26);
  });
  ctx.textAlign = 'left';

  y += 56;

  const barWidth = width - 48;
  const barHeight = 36;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('LEVEL PROGRESS', 24, y);
  y += 10;
  const rankPct = rankXPNeeded ? rankXPCurrent / rankXPNeeded : 1;
  drawInlineBar(ctx, 24, y, barWidth, barHeight, rankPct, '#facc15', rankXPNeeded ? `${rankXPCurrent} / ${rankXPNeeded}` : '👑 MAX');

  y += barHeight + 28;

  ctx.fillStyle = '#9ca3af';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    serverPosition
      ? `🏅 ترتيبه #${serverPosition} من ${serverTotal} ساحر في السيرفر`
      : '🏅 لسه مالوش ترتيب في السيرفر',
    width / 2,
    y
  );
  ctx.textAlign = 'left';

  return canvas;
}

async function createRankCardAttachment(params, filename = 'rankcard.png') {
  const canvas = createRankCardImage(params);
  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: filename });
}

module.exports = {
  drawBar,
  createHpBarAttachment,
  createManaBarAttachment,
  createDuelStatusAttachment,
  createTrainCardAttachment,
  createRankCardAttachment,
  getHpColor,
};