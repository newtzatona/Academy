const mongoose = require('mongoose');

const WandSchema = new mongoose.Schema({
  userId:   { type: String, required: true, unique: true },
  name:     { type: String, default: 'Unknown' },
  wood:     { type: String, default: 'Unknown' },
  core:     { type: String, default: 'Unknown' },
  length:   { type: String, default: 'Unknown' },
  imageUrl: { type: String, default: null },
  masteries: {
    darkArts:        { type: Number, default: 0 },
    transfiguration: { type: Number, default: 0 },
    charms:          { type: Number, default: 0 },
    healing:         { type: Number, default: 0 },
    defense:         { type: Number, default: 0 },
  },
});

module.exports = mongoose.model('Wand', WandSchema);