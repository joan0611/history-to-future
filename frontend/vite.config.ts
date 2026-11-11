import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** 빌드 지문: 화면 코드(src)와 데이터(seed.json)의 내용으로 만든 해시.
 *  게시된 미리보기의 <meta name="build-id">와 `npm run fingerprint` 결과가 같으면 같은 코드다. */
function files(dir: string): string[] {
  return readdirSync(dir).sort().flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}
export function buildId(): string {
  const h = createHash('sha256');
  for (const f of [...files('src'), '../data/seed.json']) h.update(f).update(readFileSync(f));
  return h.digest('hex').slice(0, 12);
}
const ID = buildId();

// mode 'single' → 미리보기용 단일 HTML (artifact 게시용). 기본 빌드는 일반 SPA.
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    ...(mode === 'single' ? [viteSingleFile()] : []),
    { name: 'build-id', transformIndexHtml: (html: string) => html.replace('<head>', `<head>\n    <meta name="build-id" content="${ID}">`) },
  ],
  define: { __BUILD_ID__: JSON.stringify(ID) },
  server: { fs: { allow: ['..'] } },
  base: './', // 어느 주소(하위 경로 포함)에 올려도 동작하도록 상대 경로
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist' },
}));
