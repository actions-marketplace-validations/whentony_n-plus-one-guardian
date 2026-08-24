import { Engine } from 'php-parser';
import * as util from 'util';

const parser = new Engine({
  parser: { extractDoc: true, php7: true, php8: true },
  ast: { withPositions: true }
});

const code = `
<?php
$users = User::all();
Order::where('status', 'active')->get();
foreach($users as $user) {
    $order = Order::where('user_id', $user->id)->first();
}
if (Order::count() > 0) {}
`;

const ast = parser.parseCode(code, 'test.php');
console.log(util.inspect(ast, { showHidden: false, depth: null, colors: true }));
