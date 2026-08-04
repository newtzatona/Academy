const fs = require('fs');
const { drawBar } = require('./utils/imageBars');

const canvas = drawBar({
  current: 180,
  max: 250,
  fillColor: '#4ade80',
  label: '❤️ ',
});

fs.writeFileSync('test-output.png', canvas.toBuffer('image/png'));
console.log('✅ تم! افتح test-output.png عشان تشوف الشكل');