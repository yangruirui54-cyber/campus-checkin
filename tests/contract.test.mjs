import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import ganache from 'ganache';
import {BrowserProvider,ContractFactory,ZeroAddress} from 'ethers';
import {compile} from '../scripts/build.mjs';
let rpc,provider,owner,visitor,other,contract;
before(async()=>{rpc=ganache.provider({logging:{quiet:true},wallet:{totalAccounts:4}});provider=new BrowserProvider(rpc);provider.pollingInterval=30;owner=await provider.getSigner(0);visitor=await provider.getSigner(1);other=await provider.getSigner(2);const a=compile();contract=await new ContractFactory(a.abi,a.bytecode,owner).deploy();await contract.waitForDeployment();});
after(async()=>{await provider.destroy();await rpc.disconnect();});
const tx=async p=>{await (await p).wait();};
test('creates event with organizer and capacity',async()=>{await tx(contract.createEvent('Campus workshop',2));const e=await contract.gatherings(1);assert.equal(e.organizer,await owner.getAddress());assert.equal(e.capacity,2n);assert.equal(await contract.VERSION(),'NadPass/2');});
test('rejects invalid title, capacity and nonexistent event',async()=>{await assert.rejects(tx(contract.createEvent('',2)));await assert.rejects(tx(contract.createEvent('A',0)));await assert.rejects(tx(contract.createEvent('A',501)));await assert.rejects(tx(contract.createEvent('x'.repeat(121),2)));await assert.rejects(tx(contract.issue(999,await visitor.getAddress())));});
test('only organizer can issue or revoke',async()=>{await assert.rejects(tx(contract.connect(visitor).issue(1,await visitor.getAddress())));await assert.rejects(tx(contract.connect(visitor).revoke(1,await owner.getAddress())));});
test('issues one credential and rejects duplicate or zero address',async()=>{await assert.rejects(tx(contract.issue(1,ZeroAddress)));await tx(contract.issue(1,await visitor.getAddress()));assert.equal(await contract.verify(1,await visitor.getAddress()),true);await assert.rejects(tx(contract.issue(1,await visitor.getAddress())));assert.equal((await contract.gatherings(1)).issued,1n);});
test('revocation invalidates credential without restoring capacity',async()=>{await tx(contract.revoke(1,await visitor.getAddress()));assert.equal(await contract.verify(1,await visitor.getAddress()),false);assert.equal((await contract.gatherings(1)).issued,1n);await assert.rejects(tx(contract.revoke(1,await visitor.getAddress())));await assert.rejects(tx(contract.issue(1,await visitor.getAddress())));});
test('capacity, isolation and closing are enforced',async()=>{await tx(contract.issue(1,await other.getAddress()));await assert.rejects(tx(contract.issue(1,await owner.getAddress())));await tx(contract.createEvent('Second event',5));await tx(contract.issue(2,await visitor.getAddress()));assert.equal(await contract.verify(2,await visitor.getAddress()),true);assert.equal(await contract.verify(1,await visitor.getAddress()),false);await assert.rejects(tx(contract.connect(visitor).closeEvent(2)));await tx(contract.closeEvent(2));await assert.rejects(tx(contract.issue(2,await other.getAddress())));});
test('missing credentials are false and cannot be revoked',async()=>{assert.equal(await contract.verify(999,await owner.getAddress()),false);await assert.rejects(tx(contract.revoke(2,await owner.getAddress())));});

test('participant pages preserve issuance order and revoked entries',async()=>{
 const first=await contract.listParticipants(1,0,1);
 const second=await contract.listParticipants(1,1,1);
 assert.deepEqual([...first],[await visitor.getAddress()]);
 assert.deepEqual([...second],[await other.getAddress()]);
 assert.equal((await contract.listParticipants(1,99,10)).length,0);
 assert.equal((await contract.listParticipants(999,0,10)).length,0);
 await assert.rejects(contract.listParticipants(1,0,0));
 await assert.rejects(contract.listParticipants(1,0,51));
 assert.equal((await contract.credentials(1,first[0])).revoked,true);
});
