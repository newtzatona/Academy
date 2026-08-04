const mongoose = require('mongoose');

const ScrollSchema = new mongoose.Schema({
  spellName: { type: String, required: true },
  imageUrl:  { type: String, default: null },
});

const InventorySchema = new mongoose.Schema({
  userId:  { type: String, required: true, unique: true },
  scrolls: { type: [ScrollSchema], default: [] },
});

module.exports = mongoose.model('Inventory', InventorySchema);