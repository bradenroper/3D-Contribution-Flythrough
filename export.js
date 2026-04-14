import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function runExporter() {
  const framesDir = path.join(process.cwd(), 'frames');
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir);

  // Clear old frames
  fs.readdirSync(framesDir).forEach(f => fs.unlinkSync(path.join(framesDir, f)));

  console.log('Starting Puppeteer...');
  const browser = await puppeteer.launch({ 
    headless: 'new',
    defaultViewport: { width: 800, height: 400 } // good size for github readme
  });
  
  const page = await browser.newPage();
  
  // We need to serve the Vite app. Assuming the dev server is running on localhost:5173
  console.log('Navigating to http://localhost:5173 ...');
  
  // Inject flag to stop standard animation loop
  await page.evaluateOnNewDocument(() => {
    window.IS_EXPORTING = true;
  });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  } catch (e) {
    console.error('Failed to load. Is Vite dev server running? (npm run dev)');
    await browser.close();
    process.exit(1);
  }

  // Get total duration from the app
  const totalDuration = await page.evaluate(() => window.totalDuration);
  console.log(`Animation duration: ${totalDuration.toFixed(2)}s`);

  const fps = 30; // 30 fps is good for smooth animation and reasonable size
  const dt = 1 / fps;
  const numFrames = Math.ceil(totalDuration / dt);
  
  console.log(`Capturing ${numFrames} frames...`);

  for (let i = 0; i < numFrames; i++) {
    // Step simulation
    await page.evaluate((dt) => {
      window.renderFrame(dt);
    }, dt);
    
    // Give UI and WebGL a tiny moment (sometimes helps to ensure paint)
    await new Promise(r => setTimeout(r, 10));

    // Capture screenshot
    const framePath = path.join(framesDir, `frame_${String(i).padStart(4, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png' });
    
    if (i % 20 === 0) console.log(`Frame ${i}/${numFrames}`);
  }

  console.log(`Finished capturing ${numFrames} frames.`);
  await browser.close();

  console.log('Using ffmpeg to encode GIF...');
  
  const outputGif = path.join(process.cwd(), 'contributions.gif');
  if (fs.existsSync(outputGif)) fs.unlinkSync(outputGif);

  // Use ffmpeg to convert image sequence to gif using complex filter for optimal palette
  const ffmpegCmd = `ffmpeg -y -framerate ${fps} -i frames/frame_%04d.png -filter_complex "[0:v] split [a][b];[a] palettegen [p];[b][p] paletteuse" ${outputGif}`;
  
  try {
    execSync(ffmpegCmd, { stdio: 'inherit' });
    console.log(`\\nSuccess! GIF saved to ${outputGif}`);
  } catch (err) {
    console.error('FFMPEG encoding failed:', err.message);
  }
}

runExporter().catch(console.error);
