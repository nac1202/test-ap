const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("--- Starting Magic Frame Composer ---");
    
    // Adjust this to your specific workspace path where generated images live
    const WORK_DIR = 'C:\\Users\\user\\.gemini\\antigravity\\brain\\2fe4a465-e71f-47ce-8703-a539611cf7cf';
    const OUT_DIR = path.join(__dirname, 'public/images/');
    
    console.log("Loading Master Frame...");
    let frameObj = await Jimp.read(path.join(WORK_DIR, 'master_frame_green_1777228549451.png'));
    
    // Resize frame to perfect 3:5 proportion (600x1000)
    frameObj.resize({w: 600, h: 1000});

    console.log("Processing Chroma Key Transparency...");
    frameObj.scan(0, 0, frameObj.bitmap.width, frameObj.bitmap.height, function(x, y, idx) {
        const r = this.bitmap.data[idx + 0];
        const g = this.bitmap.data[idx + 1];
        const b = this.bitmap.data[idx + 2];
        
        // DETECT BRIGHT GREEN SCREEN (#00FF00) AND MAKE IT TRANSPARENT
        if (g > 130 && r < 120 && b < 120) {
            this.bitmap.data[idx + 3] = 0; // Alpha = 0 (Transparent)
        }
        
        // Fallback safety window in the absolute center (in case AI left stubborn pixels)
        // Only wipe the absolute inner core (60px from left/right, 100px from top/bottom)
        // We leave the edges alone so filigree stays intact.
        if (x > 80 && x < 520 && y > 120 && y < 880) {
            this.bitmap.data[idx + 3] = 0; 
        }
    });
    
    await frameObj.write('docs/processed_frame_debug.png');
    console.log("Master frame window created! Saved to docs/processed_frame_debug.png");

    const TARGETS = [
        {name: 'the_fool.png', src: 'the_fool_borderless_1777228564233.png'},
        {name: 'the_magician.png', src: 'the_magician_borderless_1777228581801.png'},
        {name: 'the_high_priestess.png', src: 'the_high_priestess_borderless_1777228597739.png'},
        {name: 'the_empress.png', src: 'the_empress_borderless_1777228612460.png'},
        {name: 'the_emperor.png', src: 'the_emperor_borderless_1777228648500.png'},
        {name: 'the_hierophant.png', src: 'the_hierophant_borderless_1777228663259.png'},
        {name: 'the_lovers.png', src: 'the_lovers_borderless_1777228678746.png'},
        {name: 'the_chariot.png', src: 'the_chariot_borderless_1777228693409.png'},
        {name: 'strength.png', src: 'strength_borderless_1777228725777.png'},
        {name: 'the_hermit.png', src: 'the_hermit_borderless_1777228740154.png'},
        {name: 'wheel_of_fortune.png', src: 'wheel_of_fortune_borderless_1777228752758.png'},
        {name: 'justice.png', src: 'justice_borderless_1777228770271.png'},
        {name: 'the_hanged_man.png', src: 'the_hanged_man_borderless_1777228803902.png'},
        {name: 'death.png', src: 'death_borderless_1777228817441.png'},
        {name: 'temperance.png', src: 'temperance_borderless_1777228832127.png'},
        {name: 'the_devil.png', src: 'the_devil_borderless_1777228847267.png'},
        {name: 'the_tower.png', src: 'the_tower_borderless_1777228874104.png'},
        {name: 'the_star.png', src: 'the_star_borderless_1777228889999.png'},
        {name: 'the_moon.png', src: 'the_moon_borderless_1777228905805.png'},
        {name: 'the_sun.png', src: 'the_sun_borderless_1777228924674.png'},
        {name: 'judgement.png', src: 'judgement_borderless_1777228954254.png'},
        {name: 'the_world.png', src: 'the_world_borderless_1777228973722.png'},
        {name: 'taro-ura.png', src: 'taro_ura_borderless_1777228988255.png'}
    ];
    
    // To satisfy the user's request "only change jewel color", we swap color channels based on index.
    const shifts = [0, 1, 2, 3]; // 0=Blue, 1=Red, 2=Green, 3=Purple

    for(let i = 0; i < TARGETS.length; i++) {
        let t = TARGETS[i];
        console.log(`Compositing ${t.name}...`);
        
        let art = await Jimp.read(path.join(WORK_DIR, t.src));
        
        // This takes the borderless artwork and crops/resizes it beautifully to fill the 600x1000 bounds!
        art.cover({w: 600, h: 1000}); 
        
        let instanceFrame = frameObj.clone();
        let shiftType = shifts[i % shifts.length];
        
        // Alter ONLY the bold blue gems in the frame
        if(shiftType !== 0) {
            instanceFrame.scan(0, 0, instanceFrame.bitmap.width, instanceFrame.bitmap.height, function(x, y, idx) {
                const r = this.bitmap.data[idx + 0];
                const g = this.bitmap.data[idx + 1];
                const b = this.bitmap.data[idx + 2];
                const a = this.bitmap.data[idx + 3];
                // Detect bright blue (gems)
                if (a > 0 && b > r + 30 && b > g + 30) {
                    if(shiftType === 1) { // RED
                        this.bitmap.data[idx + 0] = b;
                        this.bitmap.data[idx + 2] = r;
                    } else if (shiftType === 2) { // GREEN
                        this.bitmap.data[idx + 1] = b;
                        this.bitmap.data[idx + 2] = g;
                    } else if (shiftType === 3) { // PURPLE (Add red to the blue)
                        this.bitmap.data[idx + 0] = b - 40; // Red
                    }
                }
            });
        }
        
        // Drop the unified transparent frame on top of the borderless painting
        art.composite(instanceFrame, 0, 0, {
            mode: Jimp.BLEND_SOURCE_OVER,
            opacitySource: 1,
            opacityDest: 1
        });
        
        await art.write(path.join(OUT_DIR, t.name));
    }
    console.log("All 23 images successfully unified and saved!");
}

main().catch(err => {
    console.error("Composer Error:", err);
});
