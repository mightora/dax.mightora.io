import test from 'node:test';
import assert from 'node:assert/strict';
import {PATTERNS,getPatternSource,parseMeasures,tokenize,formatDax,analyze} from '../src/engine.js';

test('all 27 patterns have distinct IDs and documented sources',()=>{
 const ids=new Set();
 for(const p of PATTERNS){
  assert.ok(!ids.has(p.id),'Duplicate pattern ID: '+p.id);ids.add(p.id);
  for(const key of ['title','category','level','description','code','model','why','watchout','format','docs']) assert.ok(typeof p[key]==='string'&&p[key].trim().length>0,p.id+' lacks '+key);
  assert.ok(p.docs.startsWith('https://learn.microsoft.com/'),p.id+' lacks official reference');
  assert.ok(['Beginner','Intermediate','Advanced'].includes(p.level),p.id+' invalid level');
  assert.ok(Array.isArray(p.requires),p.id+' requires must be array');
 }
 assert.equal(ids.size,27);
});
test('each snippet is one named measure and has balanced literal token boundaries',()=>{
 for(const p of PATTERNS){
  const parsed=parseMeasures(p.code);
  assert.equal(parsed.length,1,p.id+' should contain one measure');
  assert.notEqual(parsed[0].name,'(expression)',p.id+' lacks measure name');
  assert.ok(!tokenize(p.code).some(t=>t.type==='invalid'),p.id+' contains an unterminated token');
 }
});
test('helper-inclusive examples are complete, ordered, nonduplicated and parse cleanly',()=>{
 for(const p of PATTERNS){
  const full=getPatternSource(p);
  const measures=parseMeasures(full);
  const names=measures.map(m=>m.name);
  assert.equal(names.length,new Set(names).size,p.id+' has duplicated helper definitions');
  assert.equal(measures.at(-1).name,parseMeasures(p.code)[0].name,p.id+' target measure not last');
  assert.equal(measures.length,p.requires.length+1,p.id+' missing a prerequisite or nested helper');
  assert.equal(getPatternSource(p,{includeHelpers:false}),p.code);
  assert.ok(!tokenize(full).some(t=>t.type==='invalid'),p.id+' bundle contains invalid token');
 }
});
test('dependent example bundles are deterministic',()=>{
 for(const p of PATTERNS)assert.equal(getPatternSource(p),getPatternSource(p));
});
test('all examples survive DAX formatting and remain single-definition snippets',()=>{
 for(const p of PATTERNS){
  const formatted=formatDax(p.code);
  assert.ok(formatted.trim(),p.id+' formatted empty');
  assert.equal(parseMeasures(formatted).length,1,p.id+' formatter introduced extra measure');
  assert.equal(formatDax(formatted),formatted,p.id+' formatter not idempotent');
 }
});
test('division-based ratios avoid raw division and do not multiply percent by 100',()=>{
 for(const id of ['safe-divide','aov','avg-unit','yoy','share','target-variance']){
   const p=PATTERNS.find(x=>x.id===id);
   assert.match(p.code,/DIVIDE\s*\(/i,id);
   assert.doesNotMatch(p.code,/\*\s*100\b/,id);
 }
});
test('date intelligence examples explain the date-table requirement',()=>{
 for(const id of ['ytd','mtd','qtd','sales-py','yoy','running','rolling-12']){
  const p=PATTERNS.find(x=>x.id===id);
  assert.match(p.model,/date/i,id);
  assert.match(p.watchout,/date|year|month|period|quarter|visual/i,id);
 }
});
test('relationship examples explicitly warn about model dependencies',()=>{
 for(const id of ['shipdate','treatas']){
  const p=PATTERNS.find(x=>x.id===id);
  assert.match(p.model,/relationship|related|disconnected/i);
  assert.match(p.watchout,/relationship|rls|unmatched|missing/i);
 }
});
