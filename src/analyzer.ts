import Parser from 'tree-sitter';
const Php = require('tree-sitter-php');
const TypeScript = require('tree-sitter-typescript');
const Python = require('tree-sitter-python');

const parsers: Record<string, Parser> = {};

function getParser(ext: string): Parser | null {
  if (parsers[ext]) return parsers[ext];
  const parser = new Parser();
  switch(ext) {
    case '.php': 
      parser.setLanguage(Php.php || Php); 
      break;
    case '.ts': 
    case '.js':
      parser.setLanguage(TypeScript.typescript); 
      break;
    case '.py': 
      parser.setLanguage(Python); 
      break;
    default: 
      return null;
  }
  parsers[ext] = parser;
  return parser;
}

export interface Issue {
  file: string;
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

const DB_METHODS = [
  // PHP/Laravel
  'get', 'find', 'first', 'all', 'paginate', 'update', 'save', 'delete', 'count', 'exists', 'pluck',
  // JS/TS (Prisma/TypeORM)
  'findMany', 'findUnique', 'findOne', 'findFirst', 'query', 'execute',
  // Python (Django/SQLAlchemy)
  'filter', 'exclude'
];

const CAST_METHODS = [
  // PHP/Laravel
  'whereDate', 'whereMonth', 'whereYear', 'whereDay', 'whereTime',  
  // Python (Django/SQLAlchemy)
  '__date', '__year', '__month', '__day', '__week_day', '__time',
  'Cast', 'Extract', 'ExtractYear', 'ExtractMonth', 'ExtractDay', 'TruncDate',
  'cast', 'extract',  
  // JS/TS (Prisma/TypeORM/Sequelize)
  'fn' 
];

const DB_METHODS_LOWER = DB_METHODS.map(m => m.toLowerCase());
const CAST_METHODS_LOWER = CAST_METHODS.map(m => m.toLowerCase());
const RAW_METHODS_LOWER = ['whereraw', 'queryraw', '$queryraw', 'raw'];

export function analyzePhpCode(filePath: string, code: string): Issue[] {
  // Mantemos o nome da função por compatibilidade, mas ela analisa qualquer código.
  const issues: Issue[] = [];
  
  const ext = filePath.match(/\.[^.]+$/)?.[0] || '';
  const parser = getParser(ext);
  
  if (!parser) {
    console.warn(`Linguagem não suportada para o arquivo: ${filePath}`);
    return issues;
  }

  try {
    const tree = parser.parse(code);
    
    // Função recursiva para varrer a árvore Tree-sitter
    function traverse(node: Parser.SyntaxNode, inLoop: boolean = false) {
      // Verifica se o nó atual representa um laço de repetição
      const isLoopNode = node.type.includes('for') || node.type.includes('while');
      const currentInLoop = inLoop || isLoopNode;

      // Se for uma chamada de função/método, analisamos as regras
      if (node.type.includes('call')) {
        // Encontra o identificador do método sendo chamado
        const methodNode = findMethodIdentifier(node);
        if (methodNode) {
          const methodText = methodNode.text;
          const methodLower = methodText.toLowerCase();

          // Regra 1: N+1 (Somente dentro de loops)
          const isDbMethod = DB_METHODS.includes(methodText) || (ext === '.php' && DB_METHODS_LOWER.includes(methodLower));
          if (currentInLoop && isDbMethod) {
            issues.push({
              file: filePath,
              line: methodNode.startPosition.row + 1,
              message: `🚨 [N+1 Universal Detectado]: O método de banco de dados \`${methodText}()\` foi chamado dentro de um laço de repetição. Resolva a query fora do loop para evitar degradação de performance.`,
              severity: 'error'
            });
          }
          
          // Regra 2: Perda de Índice por Cast
          const isCastMethod = CAST_METHODS.includes(methodText) || CAST_METHODS_LOWER.includes(methodLower);
          const isRawMethod = RAW_METHODS_LOWER.includes(methodLower);

          if (isCastMethod) {
            issues.push({
              file: filePath,
              line: methodNode.startPosition.row + 1,
              message: `⚠️ [Perda de Índice Detectada]: O método \`${methodText}()\` aplica uma função na coluna, o que impede o banco de dados de usar índices. Considere fazer comparações de limite (>= e <=).`,
              severity: 'error'
            });
          } else if (isRawMethod && (node.text.toUpperCase().includes('CAST(') || node.text.toUpperCase().includes('CAST '))) {
            issues.push({
              file: filePath,
              line: methodNode.startPosition.row + 1,
              message: `⚠️ [Perda de Índice Detectada]: Um cast manual foi detectado na query. Isso pode ignorar os índices e degradar a performance.`,
              severity: 'error'
            });
          }
        }
      }

      // Se não achou N+1 aqui, continua descendo na árvore
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child) traverse(child, currentInLoop);
      }
    }

    traverse(tree.rootNode);

  } catch (e: any) {
    console.warn(`Erro ao fazer o parse do arquivo ${filePath}: ${e.message}`);
  }

  return issues;
}

// Tenta extrair o nome do método de dentro de uma chamada (ex: obj.metodo())
function findMethodIdentifier(callNode: Parser.SyntaxNode): Parser.SyntaxNode | null {
  // 1. Tenta usar os field names nativos do Tree-sitter ('name' ou 'function')
  const fnNode = callNode.childForFieldName('name') || callNode.childForFieldName('function');
  if (fnNode) {
    if (fnNode.type === 'property_identifier' || fnNode.type === 'name' || fnNode.type === 'identifier') {
      return fnNode;
    }
    const subProp = fnNode.childForFieldName('property') || fnNode.childForFieldName('attribute') || fnNode.childForFieldName('name');
    if (subProp) return subProp;
  }

  // 2. Fallback navegando pelos nós
  for (let i = 0; i < callNode.childCount; i++) {
    const child = callNode.child(i);
    if (!child) continue;

    if (child.type.includes('member') || child.type.includes('attribute')) {
      const prop = child.childForFieldName('property') || child.childForFieldName('attribute') || child.childForFieldName('name');
      if (prop) return prop;
      for (let j = child.childCount - 1; j >= 0; j--) {
        const sub = child.child(j);
        if (sub && (sub.type === 'property_identifier' || sub.type === 'name' || sub.type === 'identifier')) {
          return sub;
        }
      }
    }
    if (callNode.type === 'scoped_call_expression' && child.type === 'name' && i > 0) {
      return child;
    }
    if (child.type === 'identifier' || child.type === 'name') {
      return child;
    }
  }
  return null;
}

