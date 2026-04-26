const { Jimp } = require('jimp');
async function processImage(filename) {
  try {
    const image = await Jimp.read('public/images/' + filename);
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      if (r < 70 && g < 70 && b < 70) {
        this.bitmap.data[idx + 3] = 0; // Alpha -> 0
      }
    });
    await image.write('public/images/' + filename);
    console.log('Processed ' + filename);
  } catch (e) {
    console.error(e);
  }
}

Promise.all([
  processImage('icon_bd_ribbon.png'),
  processImage('icon_bd_cracker.png'),
  processImage('icon_bd_cake.png'),
  processImage('icon_bd_candles.png')
]).then(() => console.log('Done!'));
