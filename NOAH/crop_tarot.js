const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const inputDir = 'C:\\Users\\user\\.gemini\\antigravity\\brain\\2fe4a465-e71f-47ce-8703-a539611cf7cf';
const outputDir = path.join(__dirname, 'public', 'images');

const targetNames = [
    'the_fool', 'the_magician', 'the_high_priestess', 'the_empress', 'the_emperor',
    'the_hierophant', 'the_lovers', 'the_chariot', 'strength', 'the_hermit',
    'wheel_of_fortune', 'justice', 'the_hanged_man', 'death', 'temperance',
    'the_devil', 'the_tower', 'the_star', 'the_moon', 'the_sun',
    'judgement', 'the_world', 'taro_ura'
];

async function processImages() {
    console.log('--- Starting image crop and resize process ---');
    const files = fs.readdirSync(inputDir);
    let count = 0;
    
    // Sort files by modified time descending to pick the newest one for each card
    const sortedFiles = files
        .filter(f => f.endsWith('.png'))
        .map(f => ({ name: f, time: fs.statSync(path.join(inputDir, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

    const processed = new Set();

    for (const fileObj of sortedFiles) {
        const file = fileObj.name;
        
        let matchedName = null;
        for (const name of targetNames) {
            if (file.startsWith(name + '_')) {
                matchedName = name;
                break;
            }
        }
        
        if (matchedName && !processed.has(matchedName)) {
            processed.add(matchedName);
            let finalFileName = matchedName;
            if (matchedName === 'taro_ura') finalFileName = 'taro-ura';
            
            console.log(`Processing ${file} -> ${finalFileName}.png...`);
            const imgPath = path.join(inputDir, file);
            try {
                const image = await Jimp.read(imgPath);
                const targetRatio = 3/5;
                let cropWidth, cropHeight;
                if (image.bitmap.width / image.bitmap.height > targetRatio) {
                    cropHeight = image.bitmap.height;
                    cropWidth = cropHeight * targetRatio;
                } else {
                    cropWidth = image.bitmap.width;
                    cropHeight = cropWidth / targetRatio;
                }
                const cx = (image.bitmap.width - cropWidth) / 2;
                const cy = (image.bitmap.height - cropHeight) / 2;
                
                image.crop({x: cx, y: cy, w: cropWidth, h: cropHeight});
                image.resize({w: 600, h: 1000});
                
                image.write(path.join(outputDir, `${finalFileName}.png`));
                console.log(` -> Saved ${finalFileName}.png successfully.`);
                count++;
            } catch (err) {
                console.error(`Error processing ${file}:`, err);
            }
        }
    }
    console.log(`--- Finished! Processed ${count} images ---`);
}

processImages();
