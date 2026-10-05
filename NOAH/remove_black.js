const { Jimp } = require('jimp');
const fs = require('fs');

async function removeBlack() {
    const imgPath = 'public/images/master_modal_bg.png';
    const backupPath = 'public/images_backup/master_modal_bg_backup.png';
    
    // In jimp 1.6, we use Jimp.read
    const image = await Jimp.read(imgPath);
    
    // Save backup using fs just in case
    if (!fs.existsSync('public/images_backup')) {
        fs.mkdirSync('public/images_backup');
    }
    fs.copyFileSync(imgPath, backupPath);
    console.log("Backup saved to", backupPath);
    
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        const red = this.bitmap.data[idx + 0];
        const green = this.bitmap.data[idx + 1];
        const blue = this.bitmap.data[idx + 2];

        // Luma or max channel for alpha
        const alpha = Math.max(red, green, blue);
        
        if (alpha === 0) {
            this.bitmap.data[idx + 3] = 0;
        } else {
            this.bitmap.data[idx + 3] = alpha;
            // Un-premultiply
            this.bitmap.data[idx + 0] = Math.min(255, (red * 255) / alpha);
            this.bitmap.data[idx + 1] = Math.min(255, (green * 255) / alpha);
            this.bitmap.data[idx + 2] = Math.min(255, (blue * 255) / alpha);
        }
    });
    
    await image.write(imgPath);
    console.log("Image processed and saved to", imgPath);
}

removeBlack().catch(console.error);
