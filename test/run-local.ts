import * as fs from 'fs';
import * as path from 'path';
import { analyzePhpCode } from '../src/analyzer';

const mockFiles = [
  'mock-laravel-code.php',
  // 'mock-python-code.py',
  // 'mock-typescript-code.ts',
  // 'mock-javascript-code.js'
];

console.log('--- RELATÓRIO DE ANÁLISE ---');

mockFiles.forEach(file => {
  const filePath = path.resolve(__dirname, file);
  if (!fs.existsSync(filePath)) return;

  const code = fs.readFileSync(filePath, 'utf8');
  const issues = analyzePhpCode(filePath, code);

  console.log(`\n📄 Arquivo: ${file}`);
  if (issues.length === 0) {
    console.log('  ✅ Nenhum problema encontrado.');
  } else {
    issues.forEach(issue => {
      const icon = issue.severity === 'error' ? '🚨' : '⚠️';
      console.log(`  ${icon} [Linha ${issue.line}]: ${issue.message}`);
    });
  }
});

