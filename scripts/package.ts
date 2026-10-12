import AdmZip from 'adm-zip';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const target = process.argv[2];
const { name, version } = JSON.parse(readFileSync('package.json', 'utf-8')) as {
  name: string;
  version: string;
};

mkdirSync('artifacts', { recursive: true });

if (target === 'sources') {
  // Firefox review requires the original sources.
  const out = join('artifacts', `${name}-${version}-sources.zip`);
  execFileSync('git', ['archive', '--format=zip', '-o', out, 'HEAD'], {
    stdio: 'inherit',
  });
  console.log(`Created ${out}`);
} else if (target === 'chrome' || target === 'firefox') {
  const dist = join('dist', target);
  if (!existsSync(join(dist, 'manifest.json'))) {
    throw new Error(`${dist}/manifest.json not found; run the build first`);
  }
  const out = join('artifacts', `${name}-${version}-${target}.zip`);
  const zip = new AdmZip();
  zip.addLocalFolder(dist);
  zip.writeZip(out);
  console.log(`Created ${out}`);
} else {
  throw new Error('Usage: package.ts <chrome|firefox|sources>');
}
