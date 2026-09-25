import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createPreloader } from '../../src/seo/preload.js';

function distCom(manifest) {
  const dir = mkdtempSync(join(tmpdir(), 'dist-'));
  if (manifest) {
    mkdirSync(join(dir, '.vite'));
    writeFileSync(join(dir, '.vite', 'manifest.json'), JSON.stringify(manifest));
  }
  return dir;
}

const manifest = {
  'index.html': { file: 'assets/index-a.js', isEntry: true, imports: ['_react.js'] },
  '_react.js': { file: 'assets/react-b.js' },
  '_util.js': { file: 'assets/util-c.js', imports: ['_react.js'] },
  'src/pages/public/MotoDetalhe.jsx': {
    file: 'assets/MotoDetalhe-d.js',
    isDynamicEntry: true,
    imports: ['index.html', '_util.js'],
  },
};

describe('createPreloader', () => {
  it('anuncia o chunk da página e o que ele importa, sem repetir o que o HTML já carrega', () => {
    const preload = createPreloader(distCom(manifest));
    expect(preload('moto')).toEqual(['/assets/MotoDetalhe-d.js', '/assets/util-c.js']);
  });

  it('página sem chunk próprio (home) ou desconhecida: nada', () => {
    const preload = createPreloader(distCom(manifest));
    expect(preload('home')).toEqual([]);
    expect(preload('admin')).toEqual([]);
  });

  it('sem manifesto, funciona sem a otimização', () => {
    expect(createPreloader(distCom(null))('moto')).toEqual([]);
  });
});
