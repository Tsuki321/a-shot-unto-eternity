import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../site/',import.meta.url));
const prefix='/a-shot-unto-eternity/';
const server=createServer(async(req,res)=>{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!path.startsWith(prefix)){res.writeHead(404).end();return;}
  const target=resolve(root,path.slice(prefix.length)||'index.html');
  if(!target.startsWith(resolve(root))){res.writeHead(403).end();return;}
  try{const file=await readFile(target);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.svg':'image/svg+xml'})[extname(target)]||'application/octet-stream');res.end(file);}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=process.env.SITE_URL||`http://127.0.0.1:${server.address().port}${prefix}`;
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.locator('.hotspot').first().waitFor();
  await page.locator('#illustration img').evaluate(img=>img.decode());
  await page.screenshot({path:'test-results/desktop.png'});
  await page.locator('.hotspot[data-action="course-assault"]').click();
  assert.equal(await page.locator('.hotspot[data-action="course-assault"]').getAttribute('aria-pressed'),'true');
  await page.locator('.hotspot[data-action="specialization-close-quarters"]').click();
  await page.getByRole('button',{name:'Page 2: Boons',exact:true}).click();
  await page.locator('#list-view').click();
  for(const id of ['unrelenting','eleventh-hour','trickshot'])await page.locator(`#catalog [data-action="boon-${id}"]`).click();
  await page.locator('[data-page="6"]').click();await page.locator('#catalog [data-action="conspiracy-house-duravau"]').click();
  assert.match(await page.locator('#rule-status').innerText(),/follows the choice rules/);
  await page.locator('#build-name').fill('Browser Test');await page.reload();assert.equal(await page.locator('#build-name').inputValue(),'Browser Test');
  for(let n=1;n<=9;n++){
    await page.locator(`[data-page="${n}"]`).click();console.log(`Checking image ${n}`);
    await page.waitForFunction(()=>{const img=document.querySelector('#illustration img');return img.complete&&img.naturalWidth===1600;});
    // Exercise actual pixel rendering, including the bottom of each recovered page.
    const alpha=await page.locator('#illustration img').evaluate(img=>{const c=document.createElement('canvas');c.width=c.height=1;const ctx=c.getContext('2d');ctx.drawImage(img,800,img.naturalHeight-20,1,1,0,0,1,1);return ctx.getImageData(0,0,1,1).data[3];});
    assert.equal(alpha,255,`Page ${n} pixels should render`);assert.ok(await page.locator('.hotspot').count()>0);
  }
  await page.locator('#list-view').click();await page.locator('#catalog [data-action="quest-a-knight-s-prestige"]').click();
  assert.match(await page.locator('#summary').innerText(),/Lance DeLac/);
  const downloadPromise=page.waitForEvent('download');await page.locator('#export-button').click();const download=await downloadPromise;await download.saveAs('test-results/browser-test.md');
  const markdown=await readFile('test-results/browser-test.md','utf8');assert.match(markdown,/# Browser Test/);assert.match(markdown,/Gain companion: Lance DeLac/);
  await page.locator('#reset-button').click();await page.locator('#confirm-accept').click();assert.equal(await page.locator('#build-name').inputValue(),'');
  await page.locator('#import-file').setInputFiles('test-results/browser-test.md');await page.locator('#confirm-accept').click();assert.equal(await page.locator('#build-name').inputValue(),'Browser Test');
  await page.locator('[data-page="8"]').click();await page.locator('[name="quest-mode"][value="skip"]').check();
  await page.locator('#gift-choice').selectOption('character-lyza');await page.locator('#add-gift').click();assert.match(await page.locator('#summary').innerText(),/Lyza/);
  await page.locator('#gifts-panel [data-detail="character-lyza"]').click();assert.equal(await page.locator('#detail-dialog').evaluate(d=>d.open),true);await page.keyboard.press('Escape');
  await page.locator('#art-view').click();await page.screenshot({path:'test-results/desktop-build.png'});
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));
  await phone.goto(url);await phone.locator('.hotspot').first().waitFor();await phone.locator('#illustration img').evaluate(img=>img.decode());
  assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await phone.screenshot({path:'test-results/mobile.png'});
  await phone.locator('#list-view').click();await phone.locator('#catalog [data-action="course-assault"]').click();await phone.locator('#mobile-build').click();
  assert.equal(await phone.locator('#build-panel').isVisible(),true);assert.match(await phone.locator('#summary').innerText(),/Assault/);await phone.screenshot({path:'test-results/mobile-build.png'});
  await phone.locator('#close-build').click();await phone.locator('#catalog [data-detail="course-assault"]').click();assert.equal(await phone.locator('#detail-dialog').evaluate(d=>d.open),true);
  const noStorage=await browser.newContext();await noStorage.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('storage blocked');}});});
  const incognito=await noStorage.newPage();incognito.on('pageerror',e=>errors.push(e.message));await incognito.goto(url);await incognito.locator('#list-view').click();await incognito.locator('#catalog [data-action="course-assault"]').click();assert.match(await incognito.locator('#save-status').innerText(),/saving unavailable/);
  assert.deepEqual(errors,[]);console.log('Browser checks passed: desktop, mobile, all 9 images, rules, autosave, Markdown round-trip, quest rewards, substitute rewards, dialogs, storage failure.');
} finally {await browser.close();await new Promise(r=>server.close(r));}
