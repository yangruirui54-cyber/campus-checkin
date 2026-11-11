import {chromium} from 'playwright';
import ganache from 'ganache';
import assert from 'node:assert/strict';
const rpc=ganache.provider({logging:{quiet:true},chain:{chainId:10143}});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage();page.setDefaultTimeout(60000);
await page.exposeFunction('walletRpc',async request=>{
 if(request.method==='eth_requestAccounts')return rpc.request({method:'eth_accounts',params:[]});
 if(request.method==='wallet_switchEthereumChain')return null;
 return rpc.request(request);
});
await page.addInitScript(()=>{window.ethereum={request:request=>window.walletRpc(request),on:()=>{}};});
try{
 await page.goto('http://127.0.0.1:8765/docs/');await page.waitForSelector('.event-card');
 await page.locator('#network-open').click();await page.locator('#connect').click();await page.waitForFunction(()=>document.querySelector('#wallet-status').textContent.includes('已连接'));
 await page.locator('#deploy').click();await page.waitForFunction(()=>document.querySelector('#mode-badge').textContent.includes('测试网已连接'));
 assert.equal(await page.locator('#stat-events').textContent(),'0');
 await page.locator('nav [data-tab="studio"]').click();await page.locator('#create-form input[name="title"]').fill('Local EVM browser test');await page.locator('#create-form button').click();await page.waitForFunction(()=>document.querySelector('#stat-events').textContent==='1');
 await page.locator('#issue-form button[type="submit"]').click();await page.waitForFunction(()=>document.querySelector('#stat-badges').textContent==='1');
 await page.waitForSelector('#ledger-body [data-record]');assert.equal(await page.locator('#ledger-body [data-record]').count(),1);
 await page.locator('nav [data-tab="passport"]').click();await page.locator('[data-verify="1"]').click();await page.waitForSelector('#verification.valid');
 await page.locator('nav [data-tab="studio"]').click();await page.locator('#revoke').click();await page.waitForFunction(()=>document.querySelector('#stat-badges').textContent==='0');
 await page.locator('nav [data-tab="verify"]').click();await page.locator('#verify-form button').click();await page.waitForSelector('#verification.invalid');assert.match(await page.locator('#verification h2').textContent(),/撤销/);
 await page.locator('nav [data-tab="studio"]').click();await page.waitForFunction(()=>document.querySelector('#ledger-body').textContent.includes('已撤销'));page.once('dialog',d=>d.accept());await page.locator('#close-event').click();await page.waitForFunction(()=>document.querySelector('#selected-event-status').textContent.includes('已关闭'));assert.equal(await page.locator('#issue-submit').isDisabled(),true);
 console.log('Local EVM browser integration passed: connect, deploy, create, issue, verify, revoke. This is NOT a Monad deployment.');
}finally{await browser.close();await rpc.disconnect();}
