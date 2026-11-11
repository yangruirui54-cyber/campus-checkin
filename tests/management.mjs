import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1050}});
try{
 await page.goto('http://127.0.0.1:8765/docs/');await page.waitForSelector('.event-card');
 await page.locator('[data-event="1"]').click();await page.waitForSelector('#event-dialog[open]');assert.match(await page.locator('#detail-title').textContent(),/AI/);await page.locator('#detail-manage').click();await page.waitForSelector('#studio.active');
 await page.locator('#create-form input[name="title"]').fill('=Community workshop');await page.locator('#create-form input[name="capacity"]').fill('15');await page.locator('#create-form button').click();await page.waitForFunction(()=>document.querySelector('#event-select').value==='4');
 for(let i=1;i<=11;i++){await page.locator('#participant-address').fill('0x'+i.toString(16).padStart(40,'0'));await page.locator('#issue-submit').click();await page.waitForFunction(n=>document.querySelector('#selected-event-status').textContent.includes(`累计签发 ${n} /`),i);}
 assert.equal(await page.locator('#ledger-body [data-record]').count(),10);await page.locator('#ledger-next').click();assert.equal(await page.locator('#ledger-body [data-record]').count(),1);assert.match(await page.locator('#ledger-page').textContent(),/2 \/ 2/);
 const downloadWait=page.waitForEvent('download');await page.locator('#export-ledger').click();const download=await downloadWait;const csv=fs.readFileSync(await download.path(),'utf8');assert.match(csv,/event_id/);assert.match(csv,/'=Community workshop/);assert.match(csv,/local-demo/);assert.equal(csv.split(/\r?\n/).length,2);
 await page.locator('#ledger-body [data-record]').click();await page.locator('#revoke').click();await page.waitForFunction(()=>document.querySelector('#ledger-body').textContent.includes('已撤销'));
 page.once('dialog',d=>d.accept());await page.locator('#close-event').click();assert.equal(await page.locator('#issue-submit').isDisabled(),true);assert.equal(await page.locator('#revoke').isDisabled(),false);
 await page.locator('nav [data-tab="explore"]').click();await page.locator('[data-filter="closed"]').click();assert.equal(await page.locator('#event-grid .event-card').count(),1);await page.locator('[data-filter="open"]').click();assert.equal(await page.locator('#event-grid .event-card').count(),3);
 await page.locator('nav [data-tab="studio"]').click();await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/management-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 console.log('Management passed: details, create-selection, 11 participants, pagination, CSV, revocation, closure, filtering and mobile layout.');
}finally{await browser.close();}
