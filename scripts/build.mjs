import fs from 'node:fs';
import solc from 'solc';
import { build } from 'esbuild';
export function compile() {
  const input = {language:'Solidity', sources:{'NadPass.sol':{content:fs.readFileSync('contracts/NadPass.sol','utf8')}}, settings:{optimizer:{enabled:true,runs:200}, evmVersion:'paris', outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}};
  const out=JSON.parse(solc.compile(JSON.stringify(input)));
  for(const e of out.errors||[]) if(e.severity==='error') throw Error(e.formattedMessage);
  const c=out.contracts['NadPass.sol'].NadPass;
  return {abi:c.abi,bytecode:'0x'+c.evm.bytecode.object};
}
if(process.argv[1]?.endsWith('build.mjs')) {
  fs.writeFileSync('docs/contract.json',JSON.stringify(compile()));
  await build({entryPoints:['scripts/web.mjs'],bundle:true,minify:true,format:'esm',outfile:'docs/app.js',legalComments:'eof'});
  console.log('Built browser application and Solidity artifact.');
}
