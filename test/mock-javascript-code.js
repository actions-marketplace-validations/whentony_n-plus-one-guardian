// Mock JavaScript Code - Knex / TypeORM / Prisma Anti-patterns

const knex = require('knex')({ client: 'pg' });

async function report(users) {
  // Anti-pattern 1: N+1 clássico com query dentro de while (Error)
  let i = 0;
  while (i < users.length) {
    const user = users[i];
    const orders = await knex('orders').where('user_id', user.id).first();
    i++;
  }

  // Anti-pattern 2: N+1 dentro de for clássico (Error)
  for (let j = 0; j < users.length; j++) {
    const logs = await knex('user_logs').where('user_id', users[j].id).findMany();
  }
}

async function reportCast() {
  // Anti-pattern 3: Perda de índice usando raw com CAST manual (Warning)
  const results = await knex.raw('SELECT * FROM orders WHERE CAST(created_at AS DATE) = ?', ['2023-10-25']);

  // Anti-pattern 4: Perda de índice usando queryRaw com cast minúsculo (Warning)
  const items = await knex.queryRaw("select * from products where cast(code as varchar) = 'ABC'");
}

module.exports = { report, reportCast };
