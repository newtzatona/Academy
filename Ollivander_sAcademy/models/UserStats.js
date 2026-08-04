const mongoose = require('mongoose');

const ActiveEffectSchema = new mongoose.Schema({
  type:          { type: String },  // bleed, stun, cleanse
  duration:      { type: Number },  // كام تيرن فاضل
  value:         { type: Number, default: 0 }, // قيمة الـ effect زي الـ damage
}, { _id: false });

const UserStatsSchema = new mongoose.Schema({
  userId:         { type: String, required: true, unique: true },
  hp:             { type: Number, default: 250 },
  maxHp:          { type: Number, default: 250 },
  mana:           { type: Number, default: 150 },
  maxMana:        { type: Number, default: 150 },
  wins:           { type: Number, default: 0 },
  losses:         { type: Number, default: 0 },
  rank:           { type: Number, default: 1 },
  totalXP:        { type: Number, default: 0 },
  activeEffects:  { type: [ActiveEffectSchema], default: [] },
});

module.exports = mongoose.model('UserStats', UserStatsSchema);