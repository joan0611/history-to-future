// 현재 코드·데이터의 빌드 지문을 출력한다. 게시본의 <meta name="build-id">와 비교용.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const files = (d) => readdirSync(d).sort().flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : [p]; });
const h = createHash('sha256');
for (const f of [...files('src'), '../data/seed.json']) h.update(f).update(readFileSync(f));
console.log(h.digest('hex').slice(0, 12));
