import { Engine } from 'php-parser';
const parser = new Engine({ parser: { extractDoc: true, php7: true, php8: true }, ast: { withPositions: true } });
const code = `<?php if (Order::where('status', 'pending')->count() > 0) {}`;
const ast = parser.parseCode(code, 'test.php');
console.log(JSON.stringify(ast, null, 2));
