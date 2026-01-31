/**
 * Upload Stock Sound Effects to S3
 *
 * This script helps you upload sound effect files to your S3 bucket
 * for use with Remotion video rendering.
 *
 * USAGE:
 * 1. Download royalty-free sound effects from:
 *    - https://freesound.org (CC0/CC-BY licensed)
 *    - https://pixabay.com/sound-effects (Pixabay License - free commercial use)
 *    - https://mixkit.co/free-sound-effects (free for commercial use)
 *
 * 2. Place the files in: scripts/sounds/
 *    Required files:
 *    - whoosh-soft.mp3
 *    - whoosh-medium.mp3
 *    - whoosh-dramatic.mp3
 *    - ambient-nature.mp3
 *    - ambient-wellness.mp3
 *    - ambient-energy.mp3
 *
 * 3. Set environment variables:
 *    - REMOTION_AWS_ACCESS_KEY_ID
 *    - REMOTION_AWS_SECRET_ACCESS_KEY
 *    - REMOTION_AWS_BUCKET (defaults to 'remotionlambda-useast1-refjo5giq5')
 *
 * 4. Run: npx ts-node scripts/upload-stock-sounds.ts
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

const REQUIRED_SOUNDS = [
  // Transition sounds
  { name: 'whoosh-soft.mp3', description: 'Soft whoosh for gentle transitions (fade, dissolve)' },
  { name: 'whoosh-medium.mp3', description: 'Medium whoosh for standard transitions' },
  { name: 'whoosh-dramatic.mp3', description: 'Dramatic whoosh for impactful transitions (zoom, whip-pan)' },
  // Ambient sounds
  { name: 'ambient-nature.mp3', description: 'Nature ambience (birds, breeze) - ~30s, loopable' },
  { name: 'ambient-wellness.mp3', description: 'Calm spa/wellness atmosphere - ~30s, loopable' },
  { name: 'ambient-energy.mp3', description: 'Subtle energetic tone - ~30s, loopable' },
  // Impact sounds
  { name: 'impact-soft.mp3', description: 'Soft impact for subtle emphasis' },
  { name: 'impact-deep.mp3', description: 'Deep impact for strong emphasis' },
  { name: 'logo-reveal.mp3', description: 'Logo reveal sound effect' },
  // Rise sounds
  { name: 'rise-swell.mp3', description: 'Rising swell before CTA (~3s)' },
  { name: 'rise-tension.mp3', description: 'Building tension (~2.5s)' },
  // Other
  { name: 'shimmer.mp3', description: 'Magical shimmer for transitions' },
  { name: 'room-tone-warm.mp3', description: 'Warm room tone for interior scenes' },
  { name: 'room-tone-nature.mp3', description: 'Outdoor room tone with subtle nature' },
];

async function main() {
  console.log('=== Stock Sound Effects Uploader ===\n');

  // Check environment variables
  const accessKeyId = process.env.REMOTION_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.REMOTION_AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.REMOTION_AWS_BUCKET || 'remotionlambda-useast1-refjo5giq5';

  if (!accessKeyId || !secretAccessKey) {
    console.error('ERROR: Missing AWS credentials');
    console.error('Set REMOTION_AWS_ACCESS_KEY_ID and REMOTION_AWS_SECRET_ACCESS_KEY');
    process.exit(1);
  }

  const s3Client = new S3Client({
    region: 'us-east-1',
    credentials: { accessKeyId, secretAccessKey },
  });

  const soundsDir = path.join(__dirname, 'sounds');

  // Check if sounds directory exists
  if (!fs.existsSync(soundsDir)) {
    console.log(`Creating sounds directory: ${soundsDir}\n`);
    fs.mkdirSync(soundsDir, { recursive: true });
  }

  console.log('Required sound files:\n');
  REQUIRED_SOUNDS.forEach(sound => {
    const filePath = path.join(soundsDir, sound.name);
    const exists = fs.existsSync(filePath);
    console.log(`  ${exists ? '✓' : '✗'} ${sound.name}`);
    console.log(`    ${sound.description}\n`);
  });

  // Find files to upload
  const filesToUpload: string[] = [];
  const missingFiles: string[] = [];

  for (const sound of REQUIRED_SOUNDS) {
    const filePath = path.join(soundsDir, sound.name);
    if (fs.existsSync(filePath)) {
      filesToUpload.push(sound.name);
    } else {
      missingFiles.push(sound.name);
    }
  }

  if (filesToUpload.length === 0) {
    console.log('\n⚠️  No sound files found in scripts/sounds/');
    console.log('\nTo get started:');
    console.log('1. Download royalty-free sound effects from:');
    console.log('   - https://pixabay.com/sound-effects (search "whoosh", "ambient")');
    console.log('   - https://freesound.org (search for transitions, ambient)');
    console.log('   - https://mixkit.co/free-sound-effects');
    console.log(`2. Place the files in: ${soundsDir}`);
    console.log('3. Rename them to match the required filenames above');
    console.log('4. Run this script again\n');
    process.exit(0);
  }

  console.log(`\nUploading ${filesToUpload.length} files to s3://${bucket}/stock-sounds/\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const filename of filesToUpload) {
    const filePath = path.join(soundsDir, filename);
    const s3Key = `stock-sounds/${filename}`;

    try {
      // Check if file already exists in S3
      try {
        await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: s3Key }));
        console.log(`  ⏭️  ${filename} (already exists)`);
        skipCount++;
        continue;
      } catch {
        // File doesn't exist, proceed with upload
      }

      const fileBuffer = fs.readFileSync(filePath);
      const contentType = filename.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';

      await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: contentType,
        ACL: 'public-read',
      }));

      console.log(`  ✓ ${filename}`);
      successCount++;

    } catch (error: any) {
      console.error(`  ✗ ${filename}: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n=== Upload Summary ===');
  console.log(`  Uploaded: ${successCount}`);
  console.log(`  Skipped:  ${skipCount}`);
  console.log(`  Errors:   ${errorCount}`);
  console.log(`  Missing:  ${missingFiles.length}`);

  if (missingFiles.length > 0) {
    console.log('\nMissing files (download these):');
    missingFiles.forEach(f => console.log(`  - ${f}`));
  }

  if (successCount > 0 || skipCount > 0) {
    console.log('\n✓ Sound effects are available at:');
    console.log(`  https://${bucket}.s3.us-east-1.amazonaws.com/stock-sounds/\n`);

    console.log('To enable sound design, update shared/config/sound-design.ts:');
    console.log('  DEFAULT_SOUND_DESIGN_CONFIG.enabled = true');
    console.log('  DEFAULT_SOUND_DESIGN_CONFIG.transitionSounds = true\n');
  }
}

main().catch(console.error);
