import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { analyze, parseMeasures, formatDax, tokenize, extractReferences, lineDiff } from '../src/engine.js';

test('formatting stays idempotent across references, comparisons, VAR and strings',()=>{
 const sources=[
  'Sales = IF([A] = [B], 1, 0)',
  'Gross = IF([Revenue] > 0, DIVIDE([Profit], [Revenue]), BLANK())',
  'Result = VAR Value = [Sales] RETURN IF(Value = 0, 0, Value)',
  'Measure = "lowercase" & "literal"',
  "Year = IF ( 'Date'[Year] = 2026, [Sales], BLANK() )"
 ];
 for(const source of sources){const first=formatDax(source);assert.equal(formatDax(first),first,source);}
});

test('comparison operands inside a measure never become a second measure definition',()=>{
 const out=formatDax('Sales = IF([A] = [B], 1, 0)');
 assert.deepEqual(parseMeasures(out).map(x=>x.name),['Sales']);
});

test('generic Measure name remains a recognized measure',()=>{
 const parsed=parseMeasures('Measure = 1');
 assert.equal(parsed.length,1);assert.equal(parsed[0].name,'Measure');
 assert.ok(analyze('Measure = 1').warnings.some(x=>x.code==='GENERIC_NAME'));
});

test('table-qualified column does not get falsely confirmed as local measure dependency',()=>{
 const analysis=analyze('Amount = 1\n\nResult = SUM ( Sales[Amount] ) + [Amount]');
 assert.equal(analysis.dependencies.find(x=>x.table==='Sales')?.isLocal,false);
 assert.equal(analysis.dependencies.find(x=>x.table===null)?.isLocal,true);
});

test('quoted text and comments cannot create false references',()=>{
 const names=extractReferences('Result = "[Fake]" // [Comment]\n \'Real\'[Amount] + [Valid]').map(r=>r.name);
 assert.deepEqual(names,['Amount','Valid']);
});

test('5,000-measure circular chain does not overflow the JS call stack',()=>{
 const n=5000;
 const src=Array.from({length:n},(_,i)=>'M'+i+' = [M'+((i+1)%n)+']').join('\n');
 const out=analyze(src);
 assert.equal(out.measures.length,n);
 assert.equal(out.cycles.length,1);
 assert.equal(out.cycles[0].length,n+1);
});

test('1 MB measure can be analysed and formatted within a generous CI time budget',{timeout:35000},()=>{
 const src='Total =\n'+'VAR A = [B] + 1\n'.repeat(62500)+'RETURN A';
 const start=performance.now();
 const result=analyze(src);
 const formatted=formatDax(src);
 assert.equal(result.measures.length,1);
 assert.ok(formatted.includes('RETURN'));
 assert.ok(performance.now()-start < 30000, '1 MB analysis + formatting exceeded 30 seconds');
});

test('large diff uses its bounded fallback without exceeding memory limits',()=>{
 const a=Array.from({length:1000},(_,i)=>'one'+i).join('\n');
 const b=Array.from({length:1000},(_,i)=>'two'+i).join('\n');
 const rows=lineDiff(a,b);
 assert.equal(rows.length,2000);
});
