import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';

const root = resolve('dist');
function htmlFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? htmlFiles(path) : path.endsWith('.html') ? [path] : [];
  });
}
const pages = htmlFiles(root);
let links = 0;
const errors: string[] = [];
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/g)) {
    const href = match[1];
    if (/^(https?:|mailto:|tel:|javascript:)/.test(href)) continue;
    const [path, fragment] = href.split('#');
    let target = path ? resolve(path.startsWith('/') ? root : dirname(file), path.replace(/^\//, '')) : file;
    if (!path.includes('.') && path) target = join(target, 'index.html');
    try {
      const content = readFileSync(target, 'utf8');
      if (fragment && !content.includes(`id="${fragment}"`) && !content.includes(`id='${fragment}'`))
        errors.push(`${file}: missing anchor ${href}`);
      links++;
    } catch { errors.push(`${file}: missing target ${href}`); }
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Verified ${pages.length} static pages and ${links} local links/anchors.`);
