import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1050}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8765/docs/');await page.waitForSelector('.event-card');
 fs.mkdirSync('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/desktop.png',fullPage:true});
 await page.locator('#try-demo').click();await page.waitForSelector('#passport.active .event-card');assert.equal(await page.locator('#stat-badges').textContent(),'1');
 await page.reload();await page.waitForSelector('#passport.active .event-card');assert.equal(await page.locator('#stat-badges').textContent(),'1');
 await page.locator('[data-verify="1"]').click();await page.waitForSelector('#verification.valid');
 await page.locator('nav [data-tab="studio"]').click();await page.locator('#issue-form button[type="submit"]').click();await page.waitForSelector('#notice.error');assert.match(await page.locator('#notice').textContent(),/重复/);
 await page.locator('#revoke').click();await page.waitForFunction(()=>document.querySelector('#stat-badges').textContent==='0');
 await page.locator('nav [data-tab="verify"]').click();await page.locator('#verify-form button').click();await page.waitForSelector('#verification.invalid');assert.match(await page.locator('#verification h2').textContent(),/撤销/);
 await page.locator('nav [data-tab="studio"]').click();await page.locator('#create-form input[name="title"]').fill('<img src=x onerror=alert(1)>');await page.locator('#create-form button').click();await page.waitForFunction(()=>document.querySelector('#stat-events').textContent==='4');await page.locator('nav [data-tab="explore"]').click();assert.equal(await page.locator('.event-card img').count(),0);assert.equal(await page.locator('#event-grid .event-card').count(),4);
 await page.locator('#search').fill('不存在');assert.equal(await page.locator('.event-card').count(),1); // passport still has one hidden credential
 assert.match(await page.locator('#event-grid').textContent(),/没有匹配/);await page.locator('#search').fill('');
 await page.locator('#network-open').click();await page.locator('#connect').click();await page.waitForSelector('#notice.error');assert.match(await page.locator('#notice').textContent(),/钱包/);await page.locator('#network-dialog .dialog-close').click();
 await page.evaluate(()=>localStorage.clear());await page.goto('http://127.0.0.1:8765/docs/');await page.waitForSelector('.event-card');await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors.filter(e=>!e.includes('重复签发')&&!e.includes('未检测到浏览器钱包')),[]);
 console.log('UI passed: demo issue, persistence, duplicate prevention, revocation, verification, creation, escaping, search, missing wallet and mobile width.');
}finally{await browser.close();}
