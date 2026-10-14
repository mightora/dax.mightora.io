import {readFileSync} from 'node:fs';
const f=readFileSync('dist/downloads/dax-workbench-offline.html','utf8');
if(!f.includes("connect-src 'none'")||!f.includes('Offline Edition – No Internet Connection Required'))throw Error('Offline privacy / banner missing');
if (/<script[^>]+src=|<link(?=[^>]*rel="(?:stylesheet|preload|modulepreload|prefetch)")[^>]+href="https?:|<img[^>]+src="https?:/i.test(f)) throw Error('Offline edition auto-loads an external resource');
if(!f.includes("data:image/png;base64,"))throw Error('Official Mightora logo is not embedded');
console.log('Offline packaging checks passed.');