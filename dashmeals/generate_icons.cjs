const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputImage = 'public/logo.png';
const androidResDir = 'android/app/src/main/res';

const iconSizes = [
    { name: 'mipmap-mdpi', size: 48 },
    { name: 'mipmap-hdpi', size: 72 },
    { name: 'mipmap-xhdpi', size: 96 },
    { name: 'mipmap-xxhdpi', size: 144 },
    { name: 'mipmap-xxxhdpi', size: 192 }
];

async function generateIcons() {
    // Generate ic_launcher.png (square)
    for (const config of iconSizes) {
        const outDir = path.join(androidResDir, config.name);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        await sharp(inputImage)
            .resize(config.size, config.size, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .toFile(path.join(outDir, 'ic_launcher.png'));

        await sharp(inputImage)
            .resize(config.size, config.size, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .toFile(path.join(outDir, 'ic_launcher_round.png'));

        console.log(`Generated icons for ${config.name} (${config.size}x${config.size})`);
    }
}

generateIcons().catch(console.error);
