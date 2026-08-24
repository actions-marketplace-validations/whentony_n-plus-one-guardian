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

      // Se estivermos dentro de um loop, procuramos chamadas perigosas
      if (currentInLoop && node.type.includes('call')) {
        // Encontra o identificador do método sendo chamado
        const methodNode = findMethodIdentifier(node);
        if (methodNode && DB_METHODS.includes(methodNode.text)) {
          issues.push({
            file: filePath,
            line: methodNode.startPosition.row + 1,
            message: `🚨 [N+1 Universal Detectado]: O método de banco de dados \`${methodNode.text}()\` foi chamado dentro de um laço de repetição. Resolva a query fora do loop para evitar degradação de performance.`,
            severity: 'error'
          });
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
  for (let i = 0; i < callNode.childCount; i++) {
    const child = callNode.child(i);
    if (!child) continue;

    // Em TS/JS: member_expression -> property_identifier
    // Em PHP: member_call_expression -> name
    if (child.type.includes('member') || child.type.includes('attribute')) {
      for (let j = 0; j < child.childCount; j++) {
        const sub = child.child(j);
        if (sub && (sub.type === 'property_identifier' || sub.type === 'name' || sub.type === 'identifier')) {
          return sub;
        }
      }
    }
    // Funções diretas ou outros formatos
    if (child.type === 'identifier' || child.type === 'name') {
      return child;
    }
  }
  return null;
}

