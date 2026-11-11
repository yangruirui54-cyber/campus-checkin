import {BrowserProvider,Contract,ContractFactory,isAddress,getAddress,ZeroAddress} from 'ethers';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const DEMO='0x000000000000000000000000000000000000bEEF', KEY='nadpass.demo.v1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short=s=>s.slice(0,6)+'…'+s.slice(-4);
const seeded=()=>({events:[{id:1,title:'AI 共创工作坊',capacity:30,issued:0,organizer:DEMO,open:true},{id:2,title:'校园开源共学日',capacity:50,issued:0,organizer:DEMO,open:true},{id:3,title:'我的第一次 Web3 实验',capacity:40,issued:0,organizer:DEMO,open:true}],credentials:{}});
let local;
try{local=JSON.parse(localStorage.getItem(KEY))||seeded();if(!Array.isArray(local.events)||!local.credentials)throw Error();}catch{local=seeded();}
let mode='demo',account=DEMO,provider,signer,contract,chainData={events:[],credentials:{}},busy=false,toastTimer,context=0;
const data=()=>mode==='demo'?local:chainData;
const credentialKey=(id,address)=>`${id}:${address.toLowerCase()}`;
function save(){localStorage.setItem(KEY,JSON.stringify(local));}
function notify(text,error=false){$('#notice').textContent=text;$('#notice').classList.toggle('error',error);$('#notice').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#notice').hidden=true,6000);}
function tab(id){$$('.page').forEach(el=>el.classList.toggle('active',el.id===id));$$('nav button').forEach(el=>el.classList.toggle('active',el.dataset.tab===id));$('#page-name').textContent={explore:'发现活动',passport:'我的护照',studio:'活动工作台',verify:'验证凭证'}[id];history.replaceState(null,"",`?view=${id}`);}
function address(value){if(!isAddress(value)||getAddress(value)===ZeroAddress)throw Error('请输入有效的非零钱包地址。');return getAddress(value);}
async function run(action){if(busy)return;busy=true;$$('button').forEach(b=>b.disabled=true);try{await action();}catch(e){console.error(e);notify(e.shortMessage||e.reason||e.message||'操作未完成，请重试。',true);}finally{busy=false;$$('button').forEach(b=>b.disabled=false);}}
function empty(text){return `<div class="empty"><strong>${text}</strong>从一次真实的参与开始，慢慢积累你的故事。</div>`;}
function resetVerification(){$('#verification').className='panel verify-result';$('#verification').innerHTML='<span class="verify-symbol">◎</span><h2>等待查询</h2><p>输入活动编号和钱包地址，查看是否已签发、是否撤销。</p>';}
function render(){
 const d=data(), own=d.events.map(e=>({e,c:d.credentials[credentialKey(e.id,account)]})).filter(x=>x.c);
 $('#stat-events').textContent=d.events.length;$('#stat-badges').textContent=own.filter(x=>!x.c.revoked).length;
 $('#stat-network').textContent=mode==='demo'?'本地浏览器':'Monad Testnet';$('#mode-badge').innerHTML=`<i></i>${mode==='demo'?'本地演示':'测试网已连接'}`;
 $('#identity-address').textContent=account;$('#identity-source').textContent=mode==='demo'?'LOCAL DEMO':'MONAD TESTNET';
 $('#footer-status').textContent=mode==='demo'?'本地演示 · 无链上交易':`测试网 · 合约 ${short(contract.target)}`;
 $('#sample-note').textContent=mode==='demo'?'探索示例活动，体验参与记录的签发与收藏。':'读取当前合约最近 50 场活动；链上记录不等于主办方身份认证。';
 $('#reset').hidden=mode!=='demo';$('#try-demo').textContent=mode==='demo'?'体验一张参与凭证 ↗':'进入活动工作台 ↗';
 const query=$('#search').value.trim().toLowerCase();const filtered=d.events.filter(e=>e.title.toLowerCase().includes(query));
 $('#event-grid').innerHTML=filtered.map((e,i)=>`<article class="event-card"><div class="event-cover ${['','mint','peach'][i%3]}"><span class="cover-tag">${mode==='demo'?'SAMPLE EVENT':'ON TESTNET'} / ${String(e.id).padStart(3,'0')}</span><span class="cover-symbol">${['✳','⌘','◈'][i%3]}</span></div><div class="event-body"><div class="event-meta"><span>${mode==='demo'?'校园 / 示例活动':'活动方 '+esc(short(e.organizer))}</span><span>#${e.id}</span></div><h3>${esc(e.title)}</h3><p>探索一个新想法，留下你的参与记录。</p><div class="event-bottom"><span>${e.issued} / ${e.capacity} 已签发${e.open?'':' · 已关闭'}</span><button class="small-btn" data-event="${e.id}">${mode==='demo'?'体验签发 ↗':'查看签发 →'}</button></div></div></article>`).join('')||empty('没有匹配的活动');
 $('#badge-grid').innerHTML=own.map(({e,c})=>`<article class="event-card"><div class="event-cover"><span class="cover-tag">${mode==='demo'?'DEMO CREDENTIAL':'TESTNET CREDENTIAL'}</span><span class="cover-symbol">✳</span></div><div class="event-body"><div class="event-meta"><span>PARTICIPATION / #${e.id}</span><span class="badge-state ${c.revoked?'revoked':''}">${c.revoked?'已撤销':'有效'}</span></div><h3>${esc(e.title)}</h3><p>签发时间：${new Date(c.issuedAt*1000).toLocaleString('zh-CN')}<br>活动方：${esc(short(e.organizer))}</p><div class="event-bottom"><span>${mode==='demo'?'仅本机演示记录':'由测试网合约读取'}</span><button class="small-btn" data-verify="${e.id}">验证 →</button></div></div></article>`).join('')||empty('你的护照，等待第一枚印记');
 const prev=$('#event-select').value;
 $('#event-select').innerHTML=d.events.filter(e=>e.organizer.toLowerCase()===account.toLowerCase()).map(e=>`<option value="${e.id}">#${e.id} ${esc(e.title)}</option>`).join('');
 if([...$('#event-select').options].some(o=>o.value===prev))$('#event-select').value=prev;
 $('#participant-address').value=account;$('#verify-address').value=account;
}
async function ensureNetwork(){if(!provider||!signer)throw Error('请先连接浏览器钱包。');const chain=await window.ethereum.request({method:'eth_chainId'});if(BigInt(chain)!==10143n)throw Error('请切换到 Monad 测试网。');}
async function refresh(){
 if(mode==='demo'){render();return;}
 const generation=context;await ensureNetwork();const currentContract=contract,currentAccount=account;
 const count=Number(await currentContract.eventCount());const next={events:[],credentials:{}};
 for(let id=Math.max(1,count-49);id<=count;id++){
  const e=await currentContract.gatherings(id);next.events.push({id,title:e.title,organizer:e.organizer,capacity:Number(e.capacity),issued:Number(e.issued),open:e.open});
  const c=await currentContract.credentials(id,currentAccount);if(c.issuedAt>0n)next.credentials[credentialKey(id,currentAccount)]={issuedAt:Number(c.issuedAt),revoked:c.revoked};
 }
 if(generation!==context)throw Error('钱包状态已改变，请重新连接。');chainData=next;render();
}
async function send(transaction){const tx=await transaction;notify('交易已发送，正在等待测试网确认…');await tx.wait();return tx;}
async function issue(id,who,revoke=false){
 who=address(who);
 if(mode==='demo'){
  const e=local.events.find(e=>e.id===id);if(!e)throw Error('活动不存在。');
  const key=credentialKey(id,who),c=local.credentials[key];
  if(revoke){if(!c||c.revoked)throw Error('没有可撤销的有效凭证。');c.revoked=true;}
  else {if(c)throw Error('该地址已获得凭证，不能重复签发。');if(!e.open||e.issued>=e.capacity)throw Error('活动关闭或名额已满。');local.credentials[key]={issuedAt:Math.floor(Date.now()/1000),revoked:false};e.issued++;}
  save();render();
 }else{await ensureNetwork();await send(revoke?contract.revoke(id,who):contract.issue(id,who));await refresh();}
 notify(revoke?'凭证已撤销。':mode==='demo'?'已生成本地演示凭证，没有发送链上交易。':'凭证已由测试网交易签发。');
}
async function verify(id,who){
 who=address(who);let e,c;
 if(mode==='demo'){e=local.events.find(e=>e.id===id);c=local.credentials[credentialKey(id,who)];}
 else{await ensureNetwork();const raw=await contract.gatherings(id);if(raw.organizer!==ZeroAddress)e={title:raw.title,organizer:raw.organizer};const rawC=await contract.credentials(id,who);if(rawC.issuedAt>0n)c={issuedAt:Number(rawC.issuedAt),revoked:rawC.revoked};}
 const valid=!!e&&!!c&&!c.revoked;const title=!e?'活动不存在':!c?'尚未签发':c.revoked?'凭证已撤销':'凭证有效';
 $('#verification').className='panel verify-result '+(valid?'valid':'invalid');
 $('#verification').innerHTML=`<span class="verify-symbol">${valid?'✓':'◎'}</span><h2>${title}</h2><p>${e?esc(e.title):'请核对活动编号'}<br>${esc(who)}</p><p>${mode==='demo'?'本机演示查询，不是链上验证':'Monad 测试网 · '+esc(short(contract.target))}${e?'<br>签发方：'+esc(e.organizer):''}</p>`;
}
$$('[data-tab]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
$('#search').addEventListener('input',render);
$('#event-grid').addEventListener('click',e=>{const b=e.target.closest('[data-event]');if(b){tab('studio');$('#event-select').value=b.dataset.event;}});
$('#badge-grid').addEventListener('click',e=>{const b=e.target.closest('[data-verify]');if(b){tab('verify');$('#verify-form').elements.event.value=b.dataset.verify;run(()=>verify(Number(b.dataset.verify),account));}});
$('#try-demo').onclick=()=>run(async()=>{if(mode==='chain'){tab('studio');return;}const existing=local.credentials[credentialKey(1,account)];if(!existing)await issue(1,account);tab('passport');});
$('#create-form').onsubmit=e=>{e.preventDefault();run(async()=>{const form=e.currentTarget||$('#create-form');const title=form.elements.title.value.trim(),capacity=Number(form.elements.capacity.value);if(!title||new TextEncoder().encode(title).length>120||!Number.isInteger(capacity)||capacity<1||capacity>500)throw Error('名称需为 1–120 字节，名额需为 1–500 的整数。');if(mode==='demo'){local.events.push({id:Math.max(0,...local.events.map(e=>e.id))+1,title,capacity,issued:0,open:true,organizer:account});save();render();}else{await ensureNetwork();await send(contract.createEvent(title,capacity));await refresh();}form.reset();notify('活动已创建，可以签发参与凭证。');});};
$('#issue-form').onsubmit=e=>{e.preventDefault();run(()=>issue(Number($('#event-select').value),$('#participant-address').value));};
$('#revoke').onclick=()=>run(()=>issue(Number($('#event-select').value),$('#participant-address').value,true));
$('#verify-form').onsubmit=e=>{e.preventDefault();run(()=>verify(Number($('#verify-form').elements.event.value),$('#verify-address').value));};
$('#reset').onclick=()=>{if(confirm('重置本机的示例活动和凭证？')){local=seeded();save();resetVerification();render();notify('本地演示数据已重置。');}};
$('#export').onclick=()=>{const d=data();const payload={format:'NadPass-export-v1',source:mode==='demo'?'local-demo':'monad-testnet',chainId:mode==='chain'?10143:null,contract:mode==='chain'?contract.target:null,participant:account,exportedAt:new Date().toISOString(),credentials:d.events.map(e=>({event:e,credential:d.credentials[credentialKey(e.id,account)]})).filter(x=>x.credential),note:'导出文件本身不是签名证明；测试网记录需按合约地址重新查询。'};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='nadpass-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#network-open').onclick=()=>$('#network-dialog').showModal();
async function artifact(){const response=await fetch('contract.json');if(!response.ok)throw Error('无法读取合约构建文件。');return response.json();}
$('#connect').onclick=()=>run(async()=>{
 if(!window.ethereum)throw Error('未检测到浏览器钱包。可以继续体验本地演示。');
 await window.ethereum.request({method:'eth_requestAccounts'});
 try{await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x279f'}]});}
 catch(e){if(e.code!==4902)throw e;await window.ethereum.request({method:'wallet_addEthereumChain',params:[{chainId:'0x279f',chainName:'Monad Testnet',nativeCurrency:{name:'MON',symbol:'MON',decimals:18},rpcUrls:['https://testnet-rpc.monad.xyz'],blockExplorerUrls:['https://testnet.monadvision.com']}]});}
 provider=new BrowserProvider(window.ethereum);signer=await provider.getSigner();await ensureNetwork();
 $('#wallet-status').textContent='已连接 '+short(await signer.getAddress())+'；选择已有合约或部署自己的测试合约。';
});
async function attach(target){
 await ensureNetwork();target=address(target);if(await provider.getCode(target)==='0x')throw Error('这个地址没有合约代码。');
 const a=await artifact(),candidate=new Contract(target,a.abi,signer);if(await candidate.VERSION()!=='NadPass/1')throw Error('不是兼容的 NadPass 合约。');
 contract=candidate;account=await signer.getAddress();mode='chain';context++;resetVerification();
 try{await refresh();}catch(error){toDemo();throw error;}
 $('#network-dialog').close();notify('已加载测试网合约，当前展示真实合约数据。');
}
$('#attach').onclick=()=>run(()=>attach($('#contract-address').value));
$('#deploy').onclick=()=>run(async()=>{await ensureNetwork();const a=await artifact();notify('请在钱包中确认部署测试网合约。');const deployed=await new ContractFactory(a.abi,a.bytecode,signer).deploy();await deployed.waitForDeployment();const target=await deployed.getAddress();$('#contract-address').value=target;$('#wallet-status').textContent='已部署：'+target;await attach(target);});
function toDemo(){mode='demo';account=DEMO;contract=null;context++;resetVerification();render();}
$('#local-mode').onclick=()=>{toDemo();$('#network-dialog').close();};
if(window.ethereum?.on){for(const event of ['accountsChanged','chainChanged'])window.ethereum.on(event,()=>{provider=null;signer=null;toDemo();$('#wallet-status').textContent='钱包状态改变，请重新连接。';});}
window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(['explore','passport','studio','verify'].includes(id))tab(id);});
const initialView=new URLSearchParams(location.search).get('view')||location.hash.slice(1);render();tab(['explore','passport','studio','verify'].includes(initialView)?initialView:'explore');
