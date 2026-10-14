import {readFileSync} from 'node:fs';
const f=readFileSync('dist/downloads/dax-workbench-offline.html','utf8');
if(!f.includes("connect-src 'none'")||!f.includes('Offline Edition – No Internet Connection Required'))throw Error('Offline privacy / banner missing');
if (/<script[^>]+src=|<link(?=[^>]*rel="(?:stylesheet|preload|modulepreload|prefetch)")[^>]+href="https?:|<img[^>]+src="https?:/i.test(f)) throw Error('Offline edition auto-loads an external resource');
if(!f.includes("data:image/png;base64,"))throw Error('Official Mightora logo is not embedded');
const patterns=readFileSync('dist/patterns/index.html','utf8');
if(!patterns.includes('https://dax.mightora.io/patterns/'))throw Error('Static pattern catalogue has incorrect canonical URL');
if((patterns.match(/<article class="pattern-card"/g)||[]).length!==27)throw Error('Static pattern catalogue does not include all 27 patterns');
if(!patterns.includes('Complete DAX including helper measures'))throw Error('Static catalogue omits complete examples');
if(patterns.includes('type="module" src="src/app.js"'))throw Error('Static pattern catalogue unnecessarily requires JavaScript');
if(f.includes('href="patterns/"'))throw Error('Offline edition links to an unavailable online-only catalogue');
const sitemap=readFileSync('dist/sitemap.xml','utf8');
if(!sitemap.includes('https://dax.mightora.io/patterns/'))throw Error('Example catalogue not present in sitemap');

console.log('Offline packaging checks passed.');