import { readFile, writeFile } from 'node:fs/promises';

// Optional maintenance command for the supplied artwork only. Normal builds do
// not regenerate or overwrite CMS uploads. Both outputs are self-contained SVGs.
const source = 'public/media/collettivo-alan-turing.svg';
const light = await readFile(source, 'utf8');
if (/prefers-color-scheme/.test(light)) throw new Error('The light logo must not contain operating-system theme rules');
const dark = light.replaceAll('fill:#000000', 'fill:#f5f5f5').replaceAll('fill="#000000"', 'fill="#f5f5f5"');
await writeFile('public/media/collettivo-alan-turing-dark.svg', dark);
console.log('Prepared self-contained dark logo; coloured fills preserved.');
