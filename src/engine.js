/* DAX Workbench — transparent, model-free text analysis. No eval or network. */
export const PATTERNS = [
  { id:'base', category:'Essentials', title:'Base measure', description:'Sum a numeric fact column. Replace model names.', code:"Total Sales =\nSUM ( 'Sales'[Sales Amount] )" },
  { id:'safe-divide', category:'Essentials', title:'Safe percentage', description:'Protect the denominator with DIVIDE; set display format in the model.', code:"Gross Margin % =\nVAR Revenue = [Total Sales]\nVAR Cost = [Total Cost]\nRETURN\n    DIVIDE ( Revenue - Cost, Revenue )" },
  { id:'yoy', category:'Time intelligence', title:'Year-on-year growth', description:'Requires a suitable, marked date table and a valid date relationship.', code:"Sales YoY % =\nVAR CurrentSales = [Total Sales]\nVAR PreviousSales =\n    CALCULATE (\n        [Total Sales],\n        SAMEPERIODLASTYEAR ( 'Date'[Date] )\n    )\nRETURN\n    DIVIDE ( CurrentSales - PreviousSales, PreviousSales )" },
  { id:'ytd', category:'Time intelligence', title:'Year-to-date', description:'Uses the model date table and current filter context.', code:"Sales YTD =\nCALCULATE (\n    [Total Sales],\n    DATESYTD ( 'Date'[Date] )\n)" },
  { id:'running', category:'Time intelligence', title:'Running total', description:'Build a cumulative amount over visible dates.', code:"Running Sales =\nVAR LastVisibleDate = MAX ( 'Date'[Date] )\nRETURN\n    CALCULATE (\n        [Total Sales],\n        FILTER ( ALLSELECTED ( 'Date'[Date] ), 'Date'[Date] <= LastVisibleDate )\n    )" },
  { id:'share', category:'Filter context', title:'Share of selected total', description:'Calculate a proportion over a selected category context.', code:"Category Share % =\nDIVIDE (\n    [Total Sales],\n    CALCULATE ( [Total Sales], ALLSELECTED ( 'Product'[Category] ) )\n)" },
  { id:'selected', category:'Filter context', title:'Selected value with fallback', description:'Avoid an ambiguous card value when multiple values are selected.', code:"Selected Region =\nSELECTEDVALUE ( 'Region'[Region Name], \"Multiple regions\" )" },
  { id:'weighted', category:'Advanced', title:'Weighted average', description:'Iterate rows with explicit numerator and denominator.', code:"Weighted Price =\nVAR TotalValue = SUMX ( 'Sales', 'Sales'[Price] * 'Sales'[Quantity] )\nVAR TotalUnits = SUM ( 'Sales'[Quantity] )\nRETURN\n    DIVIDE ( TotalValue, TotalUnits )" }
];

const RESERVED = new Set(['VAR','RETURN','DEFINE','MEASURE','EVALUATE','ORDER','BY','START','AT','TABLE','COLUMN']);
const KEYWORDS = new Set([...RESERVED,'TRUE','FALSE','BLANK','NOT','IN','ASC','DESC']);
export function tokenize(source) {
  const s=String(source ?? '').replace(/\r\n?/g,'\n');
  const tokens=[];let i=0,line=1,col=1;
  const white=/\s+/y,word=/[A-Za-z_][A-Za-z0-9_]*/y,num=/\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?/y;
  function add(type,value){const start=i,l=line,c=col;for(const ch of value){if(ch==='\n'){line++;col=1;}else col++;}i+=value.length;tokens.push({type,value,start,end:i,line:l,col:c});}
  function match(re){re.lastIndex=i;const m=re.exec(s);return m?m[0]:null;}
  while(i<s.length){
    let v=match(white);if(v){add('space',v);continue;}
    if(s.startsWith('//',i)||s.startsWith('--',i)){const end=s.indexOf('\n',i);add('comment',s.slice(i,end<0?s.length:end));continue;}
    if(s.startsWith('/*',i)){const end=s.indexOf('*/',i+2);add(end<0?'invalid':'comment',s.slice(i,end<0?s.length:end+2));continue;}
    const c=s[i];
    if(c==='"'||c==="'"){let j=i+1,closed=false;while(j<s.length){if(s[j]===c){if(s[j+1]===c){j+=2;continue;}j++;closed=true;break;}j++;}add(closed?(c==='"'?'string':'table'):'invalid',s.slice(i,j));continue;}
    if(c==='['){let j=i+1,closed=false;while(j<s.length){if(s[j]===']'){if(s[j+1]===']'){j+=2;continue;}j++;closed=true;break;}j++;}add(closed?'reference':'invalid',s.slice(i,j));continue;}
    v=match(word);if(v){add('word',v);continue;}
    const op=s.slice(i,i+2);if(['>=','<=','<>','&&','||','==','=>'].includes(op)){add('operator',op);continue;}
    v=match(num);if(v){add('number',v);continue;}
    add('symbol',c);
  }
  return tokens;
}
function significant(tokens){return tokens.filter(t=>t.type!=='space');}
function cleanName(name){return String(name??'').trim().replace(/^\[|\]$/g,'').replace(/^'|'$/g,'').replace(/''/g,"'");}
const DEFINITION = /^\s*(?:(?:DEFINE\s+)?MEASURE\s+)?(?:(?:'((?:''|[^'])+)'|([A-Za-z_][\w]*))\s*)?\[([^\]\n]+)\]\s*=\s*(.*)$/i;
const TMDL = /^\s*measure\s+(?:'((?:''|[^'])+)'|([^'=\n]+))\s*=\s*(.*)$/i;
const SIMPLE = /^([A-Za-z_][\w %.-]{0,98}?)\s*=\s*(.*)$/;
function parseHeader(line){
  let m=DEFINITION.exec(line);
  if(m && (/^\s*(?:DEFINE\s+)?MEASURE\b/i.test(line) || !/^\s/.test(line))) return {name:cleanName(m[3]),table:cleanName(m[1]||m[2]||''),bodyStart:m[4],declaration:line.slice(0,line.length-m[4].length).trimEnd()};
  m=TMDL.exec(line); if(m) return {name:cleanName(m[1]||m[2]),table:'',bodyStart:m[3],declaration:line.slice(0,line.length-m[3].length).trimEnd()};
  m=SIMPLE.exec(line);
  if(m && !new Set(['VAR','RETURN','DEFINE','EVALUATE','ORDER','BY','TABLE','COLUMN']).has(m[1].trim().split(/\s+/)[0].toUpperCase()) && !/^[ \t]+/.test(line)) return {name:m[1].trim(),table:'',bodyStart:m[2],declaration:line.slice(0,line.length-m[2].length).trimEnd()};
  return null;
}
export function parseMeasures(source){
  const lines=String(source??'').replace(/\r\n?/g,'\n').split('\n');let current=null;const result=[];
  for(let i=0;i<lines.length;i++){
    const h=parseHeader(lines[i]);
    if(h){if(current){current.expression=current.parts.join('\n').trimEnd();delete current.parts;result.push(current);}
      current={name:h.name,table:h.table,line:i+1,declaration:h.declaration,parts:[h.bodyStart]};
    }else if(current){current.parts.push(lines[i]);}
  }
  if(current){current.expression=current.parts.join('\n').trimEnd();delete current.parts;result.push(current);}
  if(!result.length && String(source??'').trim()) return [{name:'(expression)',table:'',line:1,expression:String(source).trim()}];
  return result;
}
function printable(t){return t.type==='word' && KEYWORDS.has(t.value.toUpperCase()) ? t.value.toUpperCase() : t.value;}
const unaryStarter=new Set(['(','=','+','-','*','/','<','>','&','|',',',';',':']);
function spaceNeeded(prev,cur){
  if(!prev)return false;
  if(cur.value===')'||cur.value===','||cur.value===';'||cur.value==='.'||cur.value===']')return false;
  if(cur.value==='(')return prev.type==='word'||prev.type==='reference'||prev.value===')';
  if(prev.value==='('||prev.value==='.'||prev.value==='!'||prev.value==='@')return false;
  if(cur.type==='reference'&&(prev.type==='table'||prev.type==='word'))return false;
  if((cur.value==='-'||cur.value==='+')&&unaryStarter.has(prev.value))return false;
  if(cur.value==='%'&&prev.type==='number')return false;
  return true;
}
/** Whitespace-only formatter except for capitalization of reserved words and function calls.
 * Does not rewrite table names, quoted strings, literals, or bracketed identifiers. */
function formatExpression(input){
  const all=significant(tokenize(input));if(!all.length)return '';
  let out=[],indent=0,atStart=true,prev=null;const stack=[];
  const nl=()=>{if(out.length){const last=out.length-1;out[last]=out[last].replace(/[ \t]+$/,'');if(!out[last])out.pop();}if(out.length && out.at(-1)!=='\n')out.push('\n');atStart=true;};
  const write=(v,pad=false)=>{if(atStart){out.push('    '.repeat(Math.max(0,indent)));atStart=false;}else if(pad&&!out.at(-1)?.endsWith(' '))out.push(' ');out.push(v);};
  const isMultilineParen=(pos)=>{
    let depth=0;
    for(let k=pos;k<all.length;k++){
      if(all[k].value==='(')depth++;
      else if(all[k].value===')'){depth--;if(!depth)return false;}
      else if((all[k].value===','||all[k].value===';')&&depth===1)return true;
    }
    return false;
  };
  for(let j=0;j<all.length;j++){
    const t=all[j],next=all[j+1],up=t.value.toUpperCase();
    if(t.type==='comment'||t.type==='invalid'){
      if(t.type==='comment' && (t.value.startsWith('//')||t.value.startsWith('--'))){if(!atStart)nl();write(t.value);nl();}
      else{if(!atStart&&spaceNeeded(prev,t))write(' ');write(t.value);if(t.value.includes('\n'))nl();}
      prev=null;continue;
    }
    if(t.value===')'){
      const opened=stack.pop();indent=Math.max(0,indent-1);
      if(opened?.multi && !atStart)nl();
      else if(!atStart&&prev?.value!=='(')write(' ');
      write(')');prev=t;continue;
    }
    if(t.type==='word' && (up==='RETURN'||up==='VAR'||up==='DEFINE'||up==='EVALUATE') && prev && !atStart)nl();
    if(t.value===','||t.value===';'){
      write(t.value);if(stack.at(-1)?.multi)nl();else write(' ');prev=null;continue;
    }
    let v=printable(t);if(t.type==='word'&&next?.value==='(')v=up;
    if(t.value==='('){
      const multi=isMultilineParen(j);write('(',spaceNeeded(prev,t));stack.push({multi});indent++;
      if(multi)nl();else if(next?.value!==')')write(' ');
      prev=t;continue;
    }
    if(t.value==='='&&stack.length===0){write(' = ',false);prev=null;continue;}
    write(v,spaceNeeded(prev,t));
    if(t.type==='word'&&up==='RETURN'){nl();indent++;prev=null;continue;}
    if(t.type==='word'&&(up==='VAR'||up==='EVALUATE'))write(' ');
    prev=t;
  }
  return out.join('').trim().replace(/[ \t]+\n/g,'\n');
}
export function formatDax(input){
  const source=String(input??'');
  const found=parseMeasures(source);
  if(found.length && found[0].name!=='(expression)'){
    const pieces=[];
    for(const m of found){
      const body=formatExpression(m.expression);
      // Keep original declaration syntax (DEFINE MEASURE, TMDL or simple measure).
      // Do not discard text inside a quoted identifier or bracketed measure name.
      const declaration=m.declaration||`${m.name} =`;
      pieces.push(body?`${declaration}\n${body.split('\n').map(line=>'    '+line).join('\n')}`:declaration);
    }
    // Keep preamble: DEFINE, /// documentation and comments before the first measure.
    const preamble=source.replace(/\r\n?/g,'\n').split('\n').slice(0,found[0].line-1).join('\n').trimEnd();
    return (preamble?preamble+'\n':'')+pieces.join('\n\n');
  }
  return formatExpression(source);
}
export function extractReferences(expr){
  const t=significant(tokenize(expr));const results=[],seen=new Set();
  for(let i=0;i<t.length;i++){
    if(t[i].type!=='reference')continue;
    const before=t[i-1];const name=t[i].value.slice(1,-1).replace(/\]\]/g,']');
    const tbl=before&&(before.type==='table'||(before.type==='word'&&!KEYWORDS.has(before.value.toUpperCase())))?cleanName(before.value):null;
    const key=`${tbl??''}|${name}`.toLowerCase();
    if(!seen.has(key)){seen.add(key);results.push({key,name,table:tbl,kind:tbl?'qualified (column or measure)':'unqualified (usually measure)',line:t[i].line});}
  }
  return results;
}
function findFunctionCalls(source){
  const t=significant(tokenize(source)); const counts=new Map();
  for(let i=0;i<t.length-1;i++)if(t[i].type==='word'&&t[i+1].value==='('){const k=t[i].value.toUpperCase();counts.set(k,(counts.get(k)||0)+1);}
  return Object.fromEntries([...counts].sort((a,b)=>b[1]-a[1]));
}
export function analyze(source,{strictNames=true}={}){
 const measures=parseMeasures(source),warnings=[],dependencies=[],measMap=new Map(),functions={};
 const add=(code,severity,message,measure,line=1)=>warnings.push({code,severity,message,measure,line});
 if(!measures.length)return {measures,dependencies,warnings,functions,stats:{measures:0,references:0,warnings:0,lines:0},cycles:[]};
 for(const m of measures)if(m.name!=='(expression)'){
   const key=m.name.toLowerCase();if(measMap.has(key))add('DUPLICATE','warning',`Duplicate measure name “${m.name}” in pasted input.`,m.name,m.line);measMap.set(key,m);
 }
 const graph=new Map();
 for(const m of measures){
   const name=m.name;const lex=significant(tokenize(m.expression));const refs=extractReferences(m.expression);const fn=findFunctionCalls(m.expression);
   for(const [key,count] of Object.entries(fn))functions[key]=(functions[key]||0)+count;
   const links=[];
   for(const r of refs){const resolved=r.table?null:measMap.get(r.name.toLowerCase());const self=resolved&&resolved.name===name;
     const edge={source:name,target:r.name,table:r.table,kind:resolved?'defined measure':'unresolved; model context required',isLocal:Boolean(resolved),line:m.line+r.line-1};
     if(self)add('SELF_REFERENCE','warning',`“${name}” appears to reference itself. Confirm this is not recursion.`,name,edge.line);
     dependencies.push(edge);if(resolved)links.push(resolved.name);
   }
   graph.set(name,links);
   if(strictNames && name!=='(expression)'){
     if(/^measure\s*\d*$|^new\s*measure\s*\d*$|^test\d*$|^measure$/i.test(name)) add('GENERIC_NAME','warning','Replace the generic measure name with a business-readable name.',name,m.line);
     if(name.includes('_')) add('NAME_UNDERSCORE','info','Consider spaces rather than underscores for a user-facing measure (optional convention).',name,m.line);
     if(name.length>55) add('LONG_NAME','info','Consider a shorter descriptive measure name.',name,m.line);
   }
   if(!m.expression.trim())add('EMPTY','warning','Measure definition has no expression.',name,m.line);
   for(const x of lex){if(x.type==='invalid')add('UNTERMINATED','warning','Unterminated quote, bracket reference or block comment.',name,m.line+x.line-1);}
   let balance=0;for(const x of lex){if(x.value==='(')balance++;if(x.value===')')balance--;if(balance<0){add('PARENS','warning','Closing parenthesis without a matching opening parenthesis.',name,m.line+x.line-1);balance=0;}}if(balance>0)add('PARENS','warning',`${balance} unclosed parenthesis${balance===1?'':'es'} detected.`,name,m.line);
   const words=lex.filter(x=>x.type==='word').map(x=>x.value.toUpperCase());
   if(words.includes('FORMAT'))add('FORMAT_TEXT','info','FORMAT typically returns text; verify the intended data type and prefer model formatting when suitable.',name,m.line);
   if(words.includes('EARLIER'))add('EARLIER_REVIEW','info','EARLIER can be harder to maintain; consider a variable-based alternative where appropriate.',name,m.line);
   if((fn.IF||0)>2)add('NESTED_IF','info','Several IF calls found; consider SWITCH or intermediate variables if clearer.',name,m.line);
   const t=lex;const wordCounts=new Map();for(const x of t)if(x.type==='word'){const k=x.value.toLowerCase();wordCounts.set(k,(wordCounts.get(k)||0)+1);} for(let i=0;i<t.length;i++){
      if(t[i].value==='/' && !(t[i-1]?.value==='/'||t[i+1]?.value==='/')){add('DIVIDE_REVIEW','info','The / operator may require a zero-denominator decision; consider DIVIDE where appropriate.',name,m.line+t[i].line-1);break;}
   }
   for(let i=0;i<t.length-1;i++){
     if(t[i].type==='word' && t[i].value.toUpperCase()==='VAR' && t[i+1].type==='word'){
       const variable=t[i+1].value;const uses=wordCounts.get(variable.toLowerCase())||0;
       if(uses<=1)add('UNUSED_VAR','info',`Variable “${variable}” may not be referenced after its declaration.`,name,m.line+t[i].line-1);
     }
   }
   if(/\bSELECTEDVALUE\s*\(/i.test(m.expression))add('SELECTED_VALUE','info','Check whether SELECTEDVALUE needs an alternate result for multiple or no selected values.',name,m.line);
 }
 const cycles=[];const states=new Map();
 for(const start of graph.keys()){
   if(states.has(start))continue;
   const stack=[{name:start,index:0}],active=new Map();
   while(stack.length){
     const frame=stack.at(-1);
     if(!states.has(frame.name)){states.set(frame.name,1);active.set(frame.name,stack.length-1);}
     const next=(graph.get(frame.name)||[])[frame.index++];
     if(next===undefined){states.set(frame.name,2);active.delete(frame.name);stack.pop();continue;}
     if(!graph.has(next))continue;
     if(states.get(next)===1){const at=active.get(next);cycles.push(stack.slice(at).map(x=>x.name).concat(next));}
     else if(!states.has(next))stack.push({name:next,index:0});
   }
 }
 for(const c of cycles)add('CYCLE','warning',`Possible circular dependency: ${c.join(' → ')}.`,c[0],1);
 const lines=String(source??'').split(/\r\n?|\n/).length;
 return {measures,dependencies,warnings,functions,cycles,stats:{measures:measures.length,references:dependencies.length,warnings:warnings.filter(x=>x.severity==='warning').length,lines}};
}
export function lineDiff(before,after,{ignoreWhitespace=false}={}){
 const a=String(before??'').replace(/\r\n?/g,'\n').split('\n'),b=String(after??'').replace(/\r\n?/g,'\n').split('\n');
 // Bound memory/time: fall back to aligned line comparison for unusually large inputs.
 const normalize=x=>ignoreWhitespace?x.replace(/\s+/g,' ').trim():x;
 if(a.length*b.length>250000){const rows=[];for(let i=0;i<Math.max(a.length,b.length);i++){if(i<a.length && i<b.length&&normalize(a[i])===normalize(b[i]))rows.push({type:'equal',text:b[i],old:i+1,new:i+1});else{if(i<a.length)rows.push({type:'removed',text:a[i],old:i+1});if(i<b.length)rows.push({type:'added',text:b[i],new:i+1});}}return rows;}
 const dp=Array.from({length:a.length+1},()=>new Uint32Array(b.length+1));
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)dp[i][j]=normalize(a[i])===normalize(b[j])?1+dp[i+1][j+1]:Math.max(dp[i+1][j],dp[i][j+1]);
 let i=0,j=0;const rows=[];while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&normalize(a[i])===normalize(b[j]))rows.push({type:'equal',text:b[j],old:++i,new:++j});else if(j<b.length&&(i===a.length||dp[i][j+1]>=dp[i+1][j]))rows.push({type:'added',text:b[j],new:++j});else rows.push({type:'removed',text:a[i],old:++i});}return rows;
}
export function makeReport(source){const a=analyze(source);return {tool:'Mightora DAX Workbench',analysis:'Static heuristics only; no semantic model execution or performance assessment.',generated:new Date().toISOString(),stats:a.stats,measures:a.measures.map(m=>({name:m.name,table:m.table,line:m.line,formatted:formatDax(m.expression)})),dependencies:a.dependencies,warnings:a.warnings,functions:a.functions,cycles:a.cycles};}

