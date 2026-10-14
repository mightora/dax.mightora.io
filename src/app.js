import {PATTERNS, getPatternSource, analyze, parseMeasures, tokenize, formatDax, lineDiff, makeReport} from './engine.js';
const el=id=>document.getElementById(id);
const state={source:'',result:null,timer:null,lastToast:null};
const setText=(id,text)=>{el(id).textContent=String(text)};
function toast(message){const node=el('toast');node.textContent=message;node.classList.add('visible');clearTimeout(state.lastToast);state.lastToast=setTimeout(()=>node.classList.remove('visible'),3200);}
function download(name,text,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
async function copy(text){if(!text.trim()){toast('Nothing to copy yet.');return;}try{await navigator.clipboard.writeText(text);toast('Copied to clipboard.');}catch{const t=document.createElement('textarea');t.value=text;document.body.append(t);t.select();const ok=document.execCommand('copy');t.remove();toast(ok?'Copied to clipboard.':'Copy unavailable; select the output manually.');}}
function addFinding(target,tag,title,description,level){const entry=document.createElement('article');entry.className='finding';const badge=document.createElement('span');badge.className=`level ${level}`;badge.textContent=tag;const wrap=document.createElement('div'),h=document.createElement('strong'),p=document.createElement('p');h.textContent=title;p.textContent=description;wrap.append(h,p);entry.append(badge,wrap);target.append(entry);}
function runAnalysis({notify=false}={}){
 const source=el('daxInput').value;state.source=source;const strictNames=el('strictNames').checked;const result=analyze(source,{strictNames});state.result=result;
 setText('formattedDax',source.trim()?formatDax(source):'Format a measure to see the result here.');
 setText('measureCount',result.stats.measures);setText('refCount',result.stats.references);setText('warningCount',result.stats.warnings);setText('functionCount',Object.values(result.functions).reduce((a,b)=>a+b,0));
 const warnings=el('warnings');warnings.replaceChildren();if(!result.measures.length)addFinding(warnings,'ready','No source loaded','Paste a DAX measure or choose a calculation pattern.','ok');else if(!result.warnings.length)addFinding(warnings,'review','No heuristic findings','No checks were triggered. This does not mean the DAX is semantically correct.','ok');else {for(const f of result.warnings.slice(0,250))addFinding(warnings,f.severity,f.code.replaceAll('_',' ').toLowerCase(),`${f.measure}, line ${f.line}: ${f.message}`,f.severity);if(result.warnings.length>250)addFinding(warnings,'info','More findings available',`${result.warnings.length-250} additional findings omitted from the screen. Download the full JSON report.`, 'info');}
 const deps=el('deps');deps.replaceChildren();if(!result.dependencies.length)addFinding(deps,'info','No bracket references','No [Name] references found in this input.','info');else {for(const d of result.dependencies.slice(0,250)){addFinding(deps,d.isLocal?'local':'model',`${d.source} → ${d.table?`${d.table}.`:''}[${d.target}]`,d.isLocal?'Matches an unqualified reference to a definition in this pasted input.':`Cannot establish model lineage: ${d.kind}.`,d.isLocal?'ok':'info');}if(result.dependencies.length>250)addFinding(deps,'info','More references available',`${result.dependencies.length-250} additional references omitted from the screen. Download the full JSON report.`, 'info');}
 const fn=el('functions');fn.replaceChildren();for(const [name,count] of Object.entries(result.functions)){const chip=document.createElement('span'),strong=document.createElement('b');chip.textContent=name+' · ';strong.textContent=count;chip.append(strong);fn.append(chip);}if(!fn.childElementCount){const span=document.createElement('span');span.className='empty-chip';span.textContent='No function calls identified.';fn.append(span);}
 setText('sourceInfo',`${source.split('\n').length} lines · ${source.length} characters`);
 setText('workspaceStatus',source.trim()?`${result.warnings.length} review note${result.warnings.length===1?'':'s'}`:'Ready to analyse');
 if(notify)toast('Formatting and static analysis complete.');
}
function scheduleAnalysis(){clearTimeout(state.timer);state.timer=setTimeout(()=>runAnalysis(),300);}
function initialExample(){
 const p=PATTERNS.find(x=>x.id==='safe-divide');
 el('daxInput').value=getPatternSource(p);
 runAnalysis();
}
function buildPatterns(){
 const categories=[...new Set(PATTERNS.map(p=>p.category))];
 const sel=el('patternCategory');
 for(const c of categories){const o=document.createElement('option');o.value=c;o.textContent=c;sel.append(o);}
 const list=el('patternList');
 const byId=new Map(PATTERNS.map(p=>[p.id,p]));
 function meta(label,value){
   const row=document.createElement('div');row.className='pattern-meta-row';
   const dt=document.createElement('dt'),dd=document.createElement('dd');
   dt.textContent=label;dd.textContent=value;row.append(dt,dd);return row;
 }
 for(const p of PATTERNS){
   const article=document.createElement('article');article.className='pattern-card';
   article.dataset.category=p.category;
   article.dataset.patternId=p.id;
   article.dataset.search=(p.title+' '+p.description+' '+p.category+' '+p.level+' '+p.code+' '+p.model+' '+p.why+' '+p.watchout).toLocaleLowerCase();
   const eyebrow=document.createElement('div');eyebrow.className='pattern-eyebrow';
   const cat=document.createElement('span');cat.className='cat';cat.textContent=p.category.toUpperCase();
   const level=document.createElement('span');level.className='pattern-level';level.textContent=p.level;
   eyebrow.append(cat,level);
   const h=document.createElement('h3');h.textContent=p.title;
   const d=document.createElement('p');d.textContent=p.description;
   const preview=document.createElement('pre');preview.className='pattern-code';
   const sample=document.createElement('code');sample.textContent=p.code;preview.append(sample);
   const details=document.createElement('details');details.className='pattern-details';
   const summary=document.createElement('summary');summary.textContent='Model setup, reasoning & caveats';
   const facts=document.createElement('dl');facts.className='pattern-facts';
   facts.append(
     meta('Required model',p.model),
     meta('Why this approach',p.why),
     meta('Watch out',p.watchout),
     meta('Model format',p.format)
   );
   if(p.requires?.length){const helpers=p.requires.map(id=>byId.get(id)?.title||id);facts.append(meta('Related measures',helpers.join(' · ')+' (included with full example)'));}
   const docs=document.createElement('a');
   docs.className='pattern-docs';docs.href=p.docs;docs.target='_blank';docs.rel='noopener noreferrer';docs.textContent='Microsoft DAX reference ↗';
   details.append(summary,facts,docs);
   const actions=document.createElement('div');actions.className='pattern-actions';
   const load=document.createElement('button');load.type='button';load.className='btn btn-primary btn-small';
   load.textContent='Load complete example';
   load.setAttribute('aria-label','Load '+p.title+' with required helper measures');
   load.addEventListener('click',()=>{
     el('daxInput').value=getPatternSource(p);
     runAnalysis();
     document.getElementById('workbench').scrollIntoView({behavior:'smooth'});
     toast('Loaded '+p.title+' with '+(getPatternSource(p).split('\n\n').length-1)+' prerequisite measure(s). Adapt table names to your model.');
   });
   const copyMeasure=document.createElement('button');copyMeasure.type='button';copyMeasure.className='btn btn-quiet btn-small';
   copyMeasure.textContent='Copy measure';
   copyMeasure.setAttribute('aria-label','Copy only the '+p.title+' measure');
   copyMeasure.addEventListener('click',()=>copy(p.code));
   const copyAll=document.createElement('button');copyAll.type='button';copyAll.className='btn btn-quiet btn-small';
   copyAll.textContent='Copy with helpers';
   copyAll.setAttribute('aria-label','Copy '+p.title+' including helper measures');
   copyAll.addEventListener('click',()=>copy(getPatternSource(p)));
   actions.append(load,copyMeasure,copyAll);
   article.append(eyebrow,h,d,preview,details,actions);
   list.append(article);
 }
 const search=el('patternSearch');
 const resultCount=el('patternResultCount');
 function update(){
   const q=search.value.trim().toLocaleLowerCase();
   let shown=0;
   for(const item of list.children){
     const match=(sel.value==='all'||sel.value===item.dataset.category)&&(!q||item.dataset.search.includes(q));
     item.hidden=!match;
     if(match)shown++;
   }
   resultCount.textContent=shown+' of '+PATTERNS.length+' examples shown';
 }
 sel.addEventListener('change',update);
 search.addEventListener('input',update);
 update();
}
function renderDiff(){const diff=lineDiff(el('beforeInput').value,el('afterInput').value,{ignoreWhitespace:el('ignoreWhitespace').checked});const root=el('diffResults');root.replaceChildren();let added=0,removed=0;
const fragment=document.createDocumentFragment();let rendered=0;for(const d of diff){if(d.type==='added')added++;if(d.type==='removed')removed++;if(rendered++>=1200)continue;const row=document.createElement('div');row.className=`diff-row ${d.type}`;for(const str of [d.old??'',d.new??'',d.type==='added'?'+':d.type==='removed'?'-':' ',d.text]){const cell=document.createElement('span');cell.className=row.childElementCount<2?'lineNo':row.childElementCount===2?'sig':'lineTxt';cell.textContent=str;row.append(cell);}fragment.append(row);}root.append(fragment);if(diff.length>1200){const note=document.createElement('p');note.className='footnote';note.textContent=`Showing first 1,200 of ${diff.length} diff rows to keep the browser responsive.`;root.append(note);}
setText('diffSummary',`+${added} added / −${removed} removed · ${el('ignoreWhitespace').checked?'ignoring':'including'} whitespace`);}
function networkSummary(){const root=el('networkSummary');const resources=performance.getEntriesByType('resource');const groups={};for(const r of resources){try{const name=new URL(r.name,document.baseURI);groups[name.host]=(groups[name.host]||0)+1;}catch{}}const hosts=Object.entries(groups).sort((a,b)=>b[1]-a[1]);root.replaceChildren();const top=document.createElement('div');top.textContent=`${resources.length} visible resource entr${resources.length===1?'y':'ies'} across ${hosts.length} domain${hosts.length===1?'':'s'}.`;root.append(top);if(!hosts.length){const p=document.createElement('p');p.textContent='No separate resource requests recorded. Inline and file-local resources may not appear.';root.append(p);}else for(const [host,count] of hosts){const p=document.createElement('div');p.textContent=`${host}: ${count} resource${count===1?'':'s'}`;root.append(p);}const note=document.createElement('div');note.textContent='Performance Resource Timing is incomplete by design; use F12 → Network for verification.';note.style.marginTop='7px';root.append(note);}
function setup(){
 buildPatterns();initialExample();
 el('sampleBtn').addEventListener('click',initialExample);
 el('formatBtn').addEventListener('click',()=>runAnalysis({notify:true}));
 el('daxInput').addEventListener('input',scheduleAnalysis);
 el('daxInput').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();runAnalysis({notify:true});}});
 el('strictNames').addEventListener('change',()=>runAnalysis());
 el('copyFormatBtn').addEventListener('click',()=>copy(state.source.trim()?formatDax(el('daxInput').value):''));
 el('downloadBtn').addEventListener('click',()=>{if(!el('daxInput').value.trim()){toast('Paste DAX first.');return;}download('formatted-measures.dax',formatDax(el('daxInput').value));});
 el('clearBtn').addEventListener('click',()=>{el('daxInput').value='';runAnalysis();toast('Workspace cleared.');});
 el('importBtn').addEventListener('click',()=>el('fileInput').click());
 el('fileInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>2*1024*1024){toast('File too large. Limit: 2 MB.');e.target.value='';return;}try{el('daxInput').value=await file.text();runAnalysis();toast(`Imported ${file.name} locally.`);}catch{toast('Unable to read this file.');}e.target.value='';});
 el('reportBtn').addEventListener('click',()=>{if(!el('daxInput').value.trim()){toast('Nothing to report yet.');return;}const report=makeReport(el('daxInput').value);report.warnings=state.result.warnings;download('dax-static-review.json',JSON.stringify(report,null,2),'application/json');});
 el('compareBtn').addEventListener('click',renderDiff);el('ignoreWhitespace').addEventListener('change',renderDiff);
 el('swapBtn').addEventListener('click',()=>{const a=el('beforeInput').value;el('beforeInput').value=el('afterInput').value;el('afterInput').value=a;renderDiff();});
 el('useSourceBtn').addEventListener('click',()=>{el('afterInput').value=el('daxInput').value;renderDiff();toast('Workspace DAX copied to revised version.');});
 el('beforeInput').value="Gross Margin % =\nDIVIDE ( [Total Sales] - [Total Cost], [Total Sales] )";
 el('afterInput').value="Gross Margin % =\nVAR Revenue = [Total Sales]\nVAR Cost = [Total Cost]\nRETURN\n    DIVIDE ( Revenue - Cost, Revenue )";renderDiff();
 el('refreshNetwork').addEventListener('click',networkSummary);window.addEventListener('load',()=>setTimeout(networkSummary,700));networkSummary();
}
setup();

