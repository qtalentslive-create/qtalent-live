// Script to create a white notification icon from the existing icon
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceIcon = path.join(__dirname, '..', 'public', 'android-chrome-512x512.png');
const outputPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', 'drawable', 'ic_stat_icon_config_sample.png');

async function createNotificationIcon() {
  try {
    // Ensure drawable directory exists
    const drawableDir = path.dirname(outputPath);
    if (!fs.existsSync(drawableDir)) {
      fs.mkdirSync(drawableDir, { recursive: true });
    }

    // Read the source icon
    const image = sharp(sourceIcon);
    const metadata = await image.metadata();
    
    // Create a white version: convert to grayscale, then make it white
    // For notification icons, we want a simple white icon on transparent background
    // We'll extract the alpha channel and use it as a mask, then fill with white
    
    // Resize to 24x24 (notification icon size)
    // Then convert to grayscale and invert to get white
    await image
      .resize(24, 24, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // transparent background
      })
      .greyscale() // Convert to grayscale first
      .normalize() // Normalize the image
      .linear(1, -(128)) // Brighten to make it white (shift values up)
      .toFile(outputPath);
    
    console.log(`✅ Notification icon created at: ${outputPath}`);
    console.log('   Size: 24x24 pixels');
    console.log('   Format: White icon on transparent background');
  } catch (error) {
    console.error('Error creating notification icon:', error);
    console.log('\nFallback: Please manually create the notification icon:');
    console.log('1. Open android-chrome-512x512.png');
    console.log('2. Resize to 24x24 pixels');
    console.log('3. Convert to grayscale');
    console.log('4. Invert colors (make white)');
    console.log('5. Save as ic_stat_icon_config_sample.png in android/app/src/main/res/drawable/');
  }
}

createNotificationIcon();

