const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'prototype_document-scanner-ux-energetic.html');
const html = fs.readFileSync(htmlPath, 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  html.includes('M3 12a9 9 0 0 1 15.5-6.2') && html.includes('M6 22v-4h4'),
  'Crop redetect control must use the UX SVG path',
);
assert(/\.bottom-action\s*\{[\s\S]*?align-items:\s*center/.test(html), 'Crop action bar must vertically center buttons');
assert(/\.secondary-btn[\s\S]*?box-shadow:\s*4px 4px 0 var\(--fg\)/.test(html), 'Secondary crop button must have a shadow');
assert(/\.crop-area[\s\S]*?padding:\s*8px 14px 4px/.test(html), 'Crop area must have increased vertical space');
assert(/\.crop-canvas,[\s\S]*?aspect-ratio:\s*0\.6/.test(html), 'Crop canvas must be taller');
assert(html.includes('corner.addEventListener("pointercancel"'), 'Crop handles must handle cancelled pointers');
assert(html.includes('document.addEventListener("pointermove"'), 'Crop handles must capture pointer movement');

console.log('PASS visual crop prototype checks');
