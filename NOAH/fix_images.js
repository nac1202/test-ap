const fs = require('fs');
const Jimp = require('jimp');

let css = fs.readFileSync('public/style.css', 'utf8');
css = css.replace('background-blend-mode: screen, normal;', 'background-blend-mode: screen, screen, screen, screen, normal;');
fs.writeFileSync('public/style.css', css);

async function processImage(filename) {
  try {
    const image = await Jimp.read('public/images/' + filename);
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      // The background in the generated image is very dark purple/brown.
      if (r < 60 && g < 60 && b < 65) {
        this.bitmap.data[idx + 3] = 0; // Alpha -> 0
      } else if (r < 80 && g < 80 && b < 85) {
        // smooth feathering
        this.bitmap.data[idx + 3] = 128;
      }
    });
    await image.writeAsync('public/images/' + filename);
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
