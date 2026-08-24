import * as fs from 'fs';
import * as path from 'path';
import { analyzePhpCode } from '../src/analyzer';

const mockFile = path.resolve(__dirname, 'mock-laravel-code.php');
const code = fs.readFileSync(mockFile, 'utf8');

const issues = analyzePhpCode(mockFile, code);

console.log('--- RELATÓRIO DE ANÁLISE ---');
if (issues.length === 0) {
  console.log('✅ Nenhum problema encontrado.');
} else {
  issues.forEach(issue => {
    const icon = issue.severity === 'error' ? '🚨' : '⚠️';
    console.log(`${icon} [Linha ${issue.line}]: ${issue.message}`);
  });
}
