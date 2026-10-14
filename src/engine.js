/* DAX Workbench — transparent, model-free text analysis. No eval or network. */
export const PATTERNS = [
  {
    "id": "base",
    "category": "Core measures",
    "level": "Beginner",
    "title": "Total sales",
    "description": "Sum a numeric sales amount column in the current filter context.",
    "code": "Total Sales =\nSUM ( 'Sales'[Sales Amount] )",
    "requires": [],
    "model": "Sales fact table with numeric Sales Amount; one row can represent an order line.",
    "why": "A reusable base measure should be referenced by higher-level KPIs rather than repeating SUM throughout the model.",
    "watchout": "Check currency, returns and tax treatment; SUM ignores blank amounts.",
    "format": "Currency",
    "docs": "https://learn.microsoft.com/en-us/dax/sum-function-dax"
  },
  {
    "id": "cost",
    "category": "Core measures",
    "level": "Beginner",
    "title": "Total cost",
    "description": "Aggregate an amount-valued cost column.",
    "code": "Total Cost =\nSUM ( 'Sales'[Cost Amount] )",
    "requires": [],
    "model": "Sales[Cost Amount] stores total line cost, not per-unit cost.",
    "why": "Keep revenue and cost in separate reusable measures.",
    "watchout": "For per-unit cost, use SUMX over quantity and unit cost instead of SUM.",
    "format": "Currency",
    "docs": "https://learn.microsoft.com/en-us/dax/sum-function-dax"
  },
  {
    "id": "orders",
    "category": "Core measures",
    "level": "Beginner",
    "title": "Distinct order count",
    "description": "Count orders once even when the sales table has multiple lines per order.",
    "code": "Total Orders =\nDISTINCTCOUNT ( 'Sales'[Order ID] )",
    "requires": [],
    "model": "Sales[Order ID] is a stable order key; an order may have multiple sales lines.",
    "why": "DISTINCTCOUNT avoids inflating order counts on line-grain fact tables.",
    "watchout": "DISTINCTCOUNT includes one BLANK key if present; validate source completeness or use DISTINCTCOUNTNOBLANK.",
    "format": "Whole number",
    "docs": "https://learn.microsoft.com/en-us/dax/distinctcount-function-dax"
  },
  {
    "id": "customers",
    "category": "Core measures",
    "level": "Beginner",
    "title": "Purchasing customers",
    "description": "Count distinct nonblank customer keys represented in the selected sales.",
    "code": "Purchasing Customers =\nDISTINCTCOUNTNOBLANK ( 'Sales'[Customer ID] )",
    "requires": [],
    "model": "Sales fact rows contain Customer ID; omit customers with missing IDs.",
    "why": "Defines a purchasing-customer metric, distinct from all customers in the dimension table.",
    "watchout": "The measure only sees customers with sales records; it does not count customers with no purchases.",
    "format": "Whole number",
    "docs": "https://learn.microsoft.com/en-us/dax/distinctcountnoblank-function-dax"
  },
  {
    "id": "units",
    "category": "Core measures",
    "level": "Beginner",
    "title": "Units sold",
    "description": "Sum quantity across visible sales lines.",
    "code": "Total Units =\nSUM ( 'Sales'[Quantity] )",
    "requires": [],
    "model": "Sales[Quantity] represents signed units; returns may appear as negatives.",
    "why": "A base quantity measure is useful for volume and unit-price calculations.",
    "watchout": "Decide whether negative return quantities belong in the headline volume KPI.",
    "format": "Whole number",
    "docs": "https://learn.microsoft.com/en-us/dax/sum-function-dax"
  },
  {
    "id": "margin",
    "category": "Ratios & KPIs",
    "level": "Beginner",
    "title": "Gross margin amount",
    "description": "Compute absolute gross margin using reusable base measures.",
    "code": "Gross Margin =\n[Total Sales] - [Total Cost]",
    "requires": [
      "base",
      "cost"
    ],
    "model": "Total Sales and Total Cost use the same financial scope and comparable currency.",
    "why": "Separating margin amount from margin percentage keeps both metrics reusable.",
    "watchout": "Do not mix cost-at-standard-price with actual sales if the business definition requires realised margin.",
    "format": "Currency",
    "docs": "https://learn.microsoft.com/en-us/dax/dax-operator-reference"
  },
  {
    "id": "safe-divide",
    "category": "Ratios & KPIs",
    "level": "Beginner",
    "title": "Gross margin percentage",
    "description": "Use DIVIDE to handle zero or blank revenue safely.",
    "code": "Gross Margin % =\nDIVIDE ( [Gross Margin], [Total Sales] )",
    "requires": [
      "margin"
    ],
    "model": "Total Sales and Total Cost are defined at compatible grains.",
    "why": "DIVIDE defaults to BLANK() for a zero or blank denominator; set Percentage format in the model.",
    "watchout": "Do not multiply by 100 when using Power BI Percentage formatting; a zero fallback would change blank semantics.",
    "format": "Percentage, 1–2 decimals",
    "docs": "https://learn.microsoft.com/en-us/dax/best-practices/dax-divide-function-operator"
  },
  {
    "id": "aov",
    "category": "Ratios & KPIs",
    "level": "Beginner",
    "title": "Average order value",
    "description": "Divide total sales value by distinct orders, not by order lines.",
    "code": "Average Order Value =\nDIVIDE ( [Total Sales], [Total Orders] )",
    "requires": [
      "base",
      "orders"
    ],
    "model": "Order IDs are unique per order across the filtered dataset.",
    "why": "Using DISTINCTCOUNT for orders avoids understating average order value when orders have several lines.",
    "watchout": "Choose a consistent treatment of cancelled orders, refunds and orders with zero value.",
    "format": "Currency",
    "docs": "https://learn.microsoft.com/en-us/dax/divide-function-dax"
  },
  {
    "id": "avg-unit",
    "category": "Ratios & KPIs",
    "level": "Beginner",
    "title": "Average realised unit price",
    "description": "Find average revenue per unit, weighted by units sold.",
    "code": "Average Realised Unit Price =\nDIVIDE ( [Total Sales], [Total Units] )",
    "requires": [
      "base",
      "units"
    ],
    "model": "Sales Amount and Quantity refer to the same transactions and units.",
    "why": "Revenue divided by units is different from a simple average of product prices.",
    "watchout": "Returns, discounts, freight and mixed unit types can alter its meaning.",
    "format": "Currency per unit",
    "docs": "https://learn.microsoft.com/en-us/dax/divide-function-dax"
  },
  {
    "id": "weighted",
    "category": "Ratios & KPIs",
    "level": "Intermediate",
    "title": "Weighted unit price",
    "description": "Weight unit prices by line quantities with SUMX.",
    "code": "Weighted Unit Price =\nVAR WeightedValue =\n    SUMX ( 'Sales', 'Sales'[Unit Price] * 'Sales'[Quantity] )\nVAR Units =\n    SUM ( 'Sales'[Quantity] )\nRETURN\n    DIVIDE ( WeightedValue, Units )",
    "requires": [],
    "model": "Sales fact rows have a numeric Unit Price and Quantity at compatible line grain.",
    "why": "SUMX evaluates each row's price-times-quantity before aggregating, avoiding averaging prices equally.",
    "watchout": "Use signed quantities consistently; rounding, exchange rates and returns may mean this differs from booked revenue divided by quantity.",
    "format": "Currency per unit",
    "docs": "https://learn.microsoft.com/en-us/dax/sumx-function-dax"
  },
  {
    "id": "target-variance",
    "category": "Ratios & KPIs",
    "level": "Intermediate",
    "title": "Sales against target (%)",
    "description": "Measure variance relative to a sales target using a safe denominator.",
    "code": "Sales Variance to Target % =\nDIVIDE ( [Total Sales] - [Sales Target], [Sales Target] )",
    "requires": [
      "base",
      "sales-target"
    ],
    "model": "Targets[Sales Target] is additive and aligned to the Date/Product/Region reporting grain via appropriate relationships or allocation logic.",
    "why": "The denominator is the target, so 0.10 means 10% above target.",
    "watchout": "Targets kept at a different granularity often repeat or disappear under slicers; confirm propagation and aggregation.",
    "format": "Percentage",
    "docs": "https://learn.microsoft.com/en-us/dax/divide-function-dax"
  },
  {
    "id": "sales-target",
    "category": "Core measures",
    "level": "Beginner",
    "title": "Sales target",
    "description": "Aggregate stored target amounts under the model's date and organisational filters.",
    "code": "Sales Target =\nSUM ( 'Targets'[Sales Target] )",
    "requires": [],
    "model": "Targets fact table with numeric Sales Target at an agreed time and organisational grain.",
    "why": "Centralises target calculation for plan-versus-actual measures.",
    "watchout": "Date and other dimensions must correctly filter Targets; unaligned targets can be misleading.",
    "format": "Currency",
    "docs": "https://learn.microsoft.com/en-us/dax/sum-function-dax"
  },
  {
    "id": "ytd",
    "category": "Time intelligence",
    "level": "Intermediate",
    "title": "Year-to-date sales",
    "description": "Aggregate sales from the start of the reporting year to the current visible date.",
    "code": "Sales YTD =\nCALCULATE (\n    [Total Sales],\n    DATESYTD ( 'Date'[Date] )\n)",
    "requires": [
      "base"
    ],
    "model": "Continuous Date table related to Sales, marked as a date table for classic date-column time intelligence.",
    "why": "The date table supplies a complete calendar for time-window calculations.",
    "watchout": "This is calendar-year YTD by default; for fiscal years, adapt the DATESYTD year_end_date argument.",
    "format": "Currency",
    "docs": "https://learn.microsoft.com/en-us/dax/datesytd-function-dax"
  },
  {
    "id": "mtd",
    "category": "Time intelligence",
    "level": "Intermediate",
    "title": "Month-to-date sales",
    "description": "Return sales from the beginning of the visible month.",
    "code": "Sales MTD =\nCALCULATE (\n    [Total Sales],\n    DATESMTD ( 'Date'[Date] )\n)",
    "requires": [
      "base"
    ],
    "model": "Continuous, related date table used in visuals and slicers.",
    "why": "Keeping a standalone MTD measure avoids repeating time intelligence in each report.",
    "watchout": "The meaning depends on the current date filter context; it does not automatically mean 'through today'.",
    "format": "Currency",
    "docs": "https://learn.microsoft.com/en-us/dax/datesmtd-function-dax"
  },
  {
    "id": "qtd",
    "category": "Time intelligence",
    "level": "Intermediate",
    "title": "Quarter-to-date sales",
    "description": "Return sales since the beginning of the current calendar quarter.",
    "code": "Sales QTD =\nCALCULATE (\n    [Total Sales],\n    DATESQTD ( 'Date'[Date] )\n)",
    "requires": [
      "base"
    ],
    "model": "Continuous related Date table and calendar-quarter interpretation.",
    "why": "Makes quarter-to-date reporting consistent across visuals.",
    "watchout": "Fiscal quarter definitions may differ from calendar quarters; check your date table and requirements.",
    "format": "Currency",
    "docs": "https://learn.microsoft.com/en-us/dax/datesqtd-function-dax"
  },
  {
    "id": "sales-py",
    "category": "Time intelligence",
    "level": "Intermediate",
    "title": "Sales in previous-year period",
    "description": "Re-evaluate sales for the matching period one year earlier.",
    "code": "Sales Previous Year =\nCALCULATE (\n    [Total Sales],\n    SAMEPERIODLASTYEAR ( 'Date'[Date] )\n)",
    "requires": [
      "base"
    ],
    "model": "Continuous related Date table; time-based filters use Date columns.",
    "why": "A reusable prior-year measure supports YoY difference and growth without duplicated logic.",
    "watchout": "Missing historical dates, incomplete years and period-selection shape affect the comparison.",
    "format": "Currency",
    "docs": "https://learn.microsoft.com/en-us/dax/sameperiodlastyear-function-dax"
  },
  {
    "id": "yoy",
    "category": "Time intelligence",
    "level": "Intermediate",
    "title": "Year-on-year sales growth (%)",
    "description": "Compare the current period with the same period last year.",
    "code": "Sales YoY % =\nVAR PreviousSales = [Sales Previous Year]\nRETURN\n    DIVIDE ( [Total Sales] - PreviousSales, PreviousSales )",
    "requires": [
      "base",
      "sales-py"
    ],
    "model": "Date table has a complete calendar and a valid relationship to Sales.",
    "why": "DIVIDE returns BLANK when prior-year sales is zero or unavailable instead of an arbitrary 0% growth.",
    "watchout": "Growth can exceed 100% or be negative; compare equivalent complete periods and test leap-day behaviour.",
    "format": "Percentage",
    "docs": "https://learn.microsoft.com/en-us/dax/sameperiodlastyear-function-dax"
  },
  {
    "id": "rolling-12",
    "category": "Time intelligence",
    "level": "Advanced",
    "title": "Trailing 12 months sales",
    "description": "Calculate a moving 12-month window ending at the last date in context.",
    "code": "Sales Trailing 12M =\nVAR EndDate = MAX ( 'Date'[Date] )\nRETURN\n    CALCULATE (\n        [Total Sales],\n        DATESINPERIOD ( 'Date'[Date], EndDate, -12, MONTH )\n    )",
    "requires": [
      "base"
    ],
    "model": "Continuous related Date table; Date visual context supplies the as-of date.",
    "why": "Anchoring at MAX(Date) makes the window follow the visual or filter selection instead of hard-coding TODAY().",
    "watchout": "A partial latest month yields a trailing period ending on that day; decide whether you need 12 complete calendar months instead.",
    "format": "Currency",
    "docs": "https://learn.microsoft.com/en-us/dax/datesinperiod-function-dax"
  },
  {
    "id": "running",
    "category": "Time intelligence",
    "level": "Advanced",
    "title": "Running sales total in selection",
    "description": "Accumulate the selected date values up to the current point on a visual.",
    "code": "Running Sales =\nVAR LastVisibleDate = MAX ( 'Date'[Date] )\nRETURN\n    CALCULATE (\n        [Total Sales],\n        FILTER (\n            ALLSELECTED ( 'Date'[Date] ),\n            'Date'[Date] <= LastVisibleDate\n        )\n    )",
    "requires": [
      "base"
    ],
    "model": "Visuals and filters use the related Date dimension, with a Date-level axis.",
    "why": "ALLSELECTED retains external selection context while broadening the visual's date-point context.",
    "watchout": "ALLSELECTED semantics vary with nested visuals and iterators; this is not an unconditional lifetime total.",
    "format": "Currency",
    "docs": "https://learn.microsoft.com/en-us/dax/allselected-function-dax"
  },
  {
    "id": "share",
    "category": "Filter context",
    "level": "Intermediate",
    "title": "Share of selected category total",
    "description": "Show each product category's share within the selected category set.",
    "code": "Category Share % =\nDIVIDE (\n    [Total Sales],\n    CALCULATE (\n        [Total Sales],\n        ALLSELECTED ( 'Product'[Category] )\n    )\n)",
    "requires": [
      "base"
    ],
    "model": "Product dimension related to Sales; Product[Category] is on the visual axis or matrix.",
    "why": "ALLSELECTED can preserve page and slicer selections while calculating a visual-level comparison.",
    "watchout": "The result depends on visual shape and hierarchy; check totals and cross-filtering before interpreting as market share.",
    "format": "Percentage",
    "docs": "https://learn.microsoft.com/en-us/dax/allselected-function-dax"
  },
  {
    "id": "category-total",
    "category": "Filter context",
    "level": "Intermediate",
    "title": "Share across all categories",
    "description": "Remove just the category filter to calculate a category-independent denominator.",
    "code": "Share Across Categories % =\nDIVIDE (\n    [Total Sales],\n    CALCULATE (\n        [Total Sales],\n        REMOVEFILTERS ( 'Product'[Category] )\n    )\n)",
    "requires": [
      "base"
    ],
    "model": "Product dimension has a Category column and filters Sales.",
    "why": "REMOVEFILTERS makes the denominator independent of Category without discarding Date and other dimension filters.",
    "watchout": "Other filters on Product (such as Product Name) still apply; this is not a universal all-products share.",
    "format": "Percentage",
    "docs": "https://learn.microsoft.com/en-us/dax/calculate-function-dax"
  },
  {
    "id": "selected",
    "category": "Filter context",
    "level": "Beginner",
    "title": "Selected region label",
    "description": "Return a region name when precisely one distinct region is in context.",
    "code": "Selected Region =\nSELECTEDVALUE ( 'Region'[Region Name], \"All / multiple regions\" )",
    "requires": [],
    "model": "Region[Region Name] is a text dimension column used by report selections.",
    "why": "SELECTEDVALUE avoids ambiguous MAX/MIN text choices when more than one value is present.",
    "watchout": "The fallback also appears when zero values are selected; it does not distinguish no selection from multiple selections.",
    "format": "Text",
    "docs": "https://learn.microsoft.com/en-us/dax/selectedvalue-function-dax"
  },
  {
    "id": "active-products",
    "category": "Filter context",
    "level": "Intermediate",
    "title": "Sales of active products",
    "description": "Intersect a product status constraint with any existing report filters.",
    "code": "Sales Active Products =\nCALCULATE (\n    [Total Sales],\n    KEEPFILTERS ( 'Product'[Status] = \"Active\" )\n)",
    "requires": [
      "base"
    ],
    "model": "Product[Status] contains an Active value, and Product filters Sales.",
    "why": "KEEPFILTERS intersects the active-product constraint rather than replacing an existing filter on the same column.",
    "watchout": "If an existing selection excludes Active, the result will be blank; this is intentional intersection behaviour.",
    "format": "Currency",
    "docs": "https://learn.microsoft.com/en-us/dax/keepfilters-function-dax"
  },
  {
    "id": "rank",
    "category": "Ranking & segmentation",
    "level": "Advanced",
    "title": "Product rank (dense)",
    "description": "Rank visible products by sales without ranking the total row.",
    "code": "Product Rank =\nIF (\n    ISINSCOPE ( 'Product'[Product Name] ),\n    RANKX (\n        ALLSELECTED ( 'Product'[Product Name] ),\n        [Total Sales],\n        ,\n        0,\n        \"Dense\"\n    )\n)",
    "requires": [
      "base"
    ],
    "model": "Product dimension filters Sales; Product Name is unique per product or replace it with a product key.",
    "why": "Dense ranking gives consecutive ranks after ties; ISINSCOPE avoids a misleading grand-total rank.",
    "watchout": "Duplicate product names can merge products; floating-point values may produce unexpected ties; large cardinality can be costly.",
    "format": "Whole number",
    "docs": "https://learn.microsoft.com/en-us/dax/rankx-function-dax"
  },
  {
    "id": "shipdate",
    "category": "Relationships & modelling",
    "level": "Advanced",
    "title": "Sales by shipping date",
    "description": "Temporarily activate the Ship Date relationship in a measure.",
    "code": "Sales by Ship Date =\nCALCULATE (\n    [Total Sales],\n    USERELATIONSHIP ( 'Sales'[Ship Date], 'Date'[Date] )\n)",
    "requires": [
      "base"
    ],
    "model": "Sales[Ship Date] → Date[Date] existing inactive relationship; another active order-date relationship may also exist.",
    "why": "USERELATIONSHIP applies a specific existing relationship for this calculation without changing the whole model.",
    "watchout": "Check model RLS restrictions and relationship direction; missing/incomplete shipping dates may produce blanks.",
    "format": "Currency",
    "docs": "https://learn.microsoft.com/en-us/dax/userelationship-function-dax"
  },
  {
    "id": "treatas",
    "category": "Relationships & modelling",
    "level": "Advanced",
    "title": "Disconnected region selection",
    "description": "Apply a disconnected selector's values as filters on a region dimension.",
    "code": "Sales Selected Regions =\nCALCULATE (\n    [Total Sales],\n    TREATAS (\n        VALUES ( 'Region Selector'[Region Name] ),\n        'Region'[Region Name]\n    )\n)",
    "requires": [
      "base"
    ],
    "model": "Region Selector disconnected from the model; Region table related to Sales; both columns contain compatible names.",
    "why": "TREATAS creates filter propagation from a disconnected selection where no physical relationship exists.",
    "watchout": "Unmatched selector values are ignored. Prefer a real relationship where a suitable model relationship is possible.",
    "format": "Currency",
    "docs": "https://learn.microsoft.com/en-us/dax/treatas-function-dax"
  },
  {
    "id": "zero",
    "category": "Relationships & modelling",
    "level": "Beginner",
    "title": "Show zero instead of blank",
    "description": "Explicitly show 0 for a blank result when reporting needs it.",
    "code": "Sales Display Zero =\nCOALESCE ( [Total Sales], 0 )",
    "requires": [
      "base"
    ],
    "model": "Total Sales already defined as a numeric measure.",
    "why": "COALESCE converts BLANK to zero for display-friendly KPIs.",
    "watchout": "Replacing missing data with zero can be misleading and can cause visuals to show more categories; only use when justified.",
    "format": "Currency",
    "docs": "https://learn.microsoft.com/en-us/dax/coalesce-function-dax"
  }
];

/** Build a copy-ready source including recursively required base measures.
 * The examples still require the documented semantic-model tables and relationships. */
export function getPatternSource(pattern, { includeHelpers = true } = {}) {
  if (!pattern || typeof pattern.code !== 'string') return '';
  if (!includeHelpers) return pattern.code;
  const visited = new Set(), active = new Set(), snippets = [];
  const byId = new Map(PATTERNS.map(p => [p.id,p]));
  function add(entry) {
    if (visited.has(entry.id)) return;
    if (active.has(entry.id)) throw Error('Circular pattern prerequisites: ' + entry.id);
    active.add(entry.id);
    for (const id of entry.requires || []) {
      const dependency=byId.get(id);
      if (!dependency) throw Error('Unknown prerequisite pattern: ' + id);
      add(dependency);
    }
    active.delete(entry.id);
    visited.add(entry.id);
    snippets.push(entry.code.trim());
  }
  add(pattern);
  return snippets.join('\n\n');
}

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

