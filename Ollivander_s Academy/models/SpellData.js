const mongoose = require('mongoose');

const SpellDataSchema = new mongoose.Schema({
  userId:      { type: String, required: true },
  spellName:   { type: String, required: true },
  totalXP:     { type: Number, default: 0 },
  level:       { type: Number, default: 1 },
  lastTrained: { type: Number, default: 0 },
});

SpellDataSchema.index({ userId: 1, spellName: 1 }, { unique: true });

module.exports = mongoose.model('SpellData', SpellDataSchema);