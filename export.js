import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function fetchContributions() {
  if (!GITHUB_USERNAME || !GITHUB_TOKEN) {
    console.warn('⚠️ GITHUB_USERNAME or GITHUB_TOKEN not set! Using fallback dummy data.');
    return null;
  }
  
  console.log(`Fetching data for ${GITHUB_USERNAME}...`);
  const query = `
    query {
      user(login: "${GITHUB_USERNAME}") {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  
  const json = await res.json();
  if (json.errors) {
    console.error('GraphQL Error:', json.errors);
    return null;
  }
  return json.data.user.contributionsCollection.contributionCalendar;
}

async function runExporter() {
  const framesDir = path.join(process.cwd(), 'frames');
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir);
  fs.readdirSync(framesDir).forEach(f => fs.unlinkSync(path.join(framesDir, f)));

  const liveData = await fetchContributions();

  console.log('Starting Puppeteer...');
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 800, height: 400 } 
  });
  
  const page = await browser.newPage();
  
  // Inject live data and exporting flag before any JS runs
  await page.evaluateOnNewDocument((data) => {
    window.IS_EXPORTING = true;
    if (data) window.GITHUB_DATA = data;
  }, liveData);

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  } catch (e) {
    console.error('Failed to load. Is Vite dev server running? (npm run dev)');
    await browser.close();
    process.exit(1);
  }

  const totalDuration = await page.evaluate(() => window.totalDuration);
  console.log(`Animation duration: ${totalDuration.toFixed(2)}s`);

  const fps = 30;
  const dt = 1 / fps;
  const numFrames = Math.ceil(totalDuration / dt);
  
  console.log(`Capturing ${numFrames} frames...`);

  for (let i = 0; i < numFrames; i++) {
    await page.evaluate((dt) => window.renderFrame(dt), dt);
    await new Promise(r => setTimeout(r, 10));
    const framePath = path.join(framesDir, `frame_${String(i).padStart(4, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png' });
    if (i % 20 === 0) console.log(`Frame ${i}/${numFrames}`);
  }

  console.log(`Finished capturing ${numFrames} frames.`);
  await browser.close();

  console.log('Using ffmpeg to encode GIF...');
  const outputGif = path.join(process.cwd(), 'contributions.gif');
  if (fs.existsSync(outputGif)) fs.unlinkSync(outputGif);

  const ffmpegCmd = `ffmpeg -y -framerate ${fps} -i frames/frame_%04d.png -filter_complex "[0:v] split [a][b];[a] palettegen [p];[b][p] paletteuse" -loop 0 ${outputGif}`;
  
  try {
    execSync(ffmpegCmd, { stdio: 'inherit' });
    console.log(`\nSuccess! GIF saved to ${outputGif}`);
  } catch (err) {
    console.error('FFMPEG encoding failed:', err.message);
    process.exit(1);
  }
}

runExporter().catch((err) => {
  console.error(err);
  process.exit(1);
});
