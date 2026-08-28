import { analyzePhpCode } from '../src/analyzer';

describe('Analyzer Universal (Tree-sitter) - Detecção de N+1', () => {

  it('deve detectar N+1 em PHP (Laravel Eloquent)', () => {
    const code = `
      <?php
      $users = User::all();
      foreach($users as $user) {
          $order = Order::where('user_id', $user->id)->first();
      }
    `;
    const issues = analyzePhpCode('test.php', code);
    
    expect(issues.length).toBeGreaterThan(0);
    const nPlusOneIssue = issues.find(i => i.message.includes('N+1 Universal Detectado') && i.message.includes('first()'));
    expect(nPlusOneIssue).toBeDefined();
    expect(nPlusOneIssue?.severity).toBe('error');
  });

  it('deve detectar N+1 em TypeScript (NestJS / Prisma)', () => {
    const code = `
      const users = await prisma.user.findMany();
      for (const user of users) {
          const posts = await prisma.post.findMany({ where: { userId: user.id } });
      }
    `;
    const issues = analyzePhpCode('test.ts', code);
    
    expect(issues.length).toBeGreaterThan(0);
    const nPlusOneIssue = issues.find(i => i.message.includes('N+1 Universal Detectado') && i.message.includes('findMany()'));
    expect(nPlusOneIssue).toBeDefined();
  });

  it('deve detectar N+1 em Python (Django / SQLAlchemy)', () => {
    const code = `
users = User.objects.all()
for user in users:
    posts = Post.objects.filter(user_id=user.id)
    `;
    const issues = analyzePhpCode('test.py', code);
    
    expect(issues.length).toBeGreaterThan(0);
    const nPlusOneIssue = issues.find(i => i.message.includes('N+1 Universal Detectado') && i.message.includes('filter()'));
    expect(nPlusOneIssue).toBeDefined();
  });

  it('NÃO deve alertar N+1 se a chamada de banco estiver fora do loop', () => {
    const code = `
      const users = await prisma.user.findMany({ include: { posts: true } });
      for (const user of users) {
          console.log(user.posts);
      }
    `;
    const issues = analyzePhpCode('test.ts', code);
    expect(issues.length).toBe(0);
  });


  it('deve detectar perda de indice por uso de whereDate em PHP', () => {
    const code = `
      <?php
      $users = User::whereDate('created_at', '2023-01-01')->get();
    `;
    const issues = analyzePhpCode('test.php', code);
    
    expect(issues.length).toBeGreaterThan(0);
    const indexLossIssue = issues.find(i => i.message.includes('Perda de Índice Detectada') && i.message.includes('whereDate()'));
    expect(indexLossIssue).toBeDefined();
    expect(indexLossIssue?.severity).toBe('warning');
  });

  it('deve detectar perda de indice por uso de whereRaw com CAST em PHP', () => {
    const code = `
      <?php
      $users = User::whereRaw('CAST(id AS CHAR) = "1"')->get();
    `;
    const issues = analyzePhpCode('test.php', code);
    
    expect(issues.length).toBeGreaterThan(0);
    const indexLossIssue = issues.find(i => i.message.includes('Perda de Índice Detectada') && i.message.includes('cast manual'));
    expect(indexLossIssue).toBeDefined();
  });

  it('deve detectar perda de indice por uso de Cast em Python', () => {
    const code = `
      users = User.objects.annotate(str_id=Cast('id', CharField())).filter(str_id="1")
    `;
    const issues = analyzePhpCode('test.py', code);
    
    expect(issues.length).toBeGreaterThan(0);
    const indexLossIssue = issues.find(i => i.message.includes('Perda de Índice Detectada') && i.message.includes('Cast()'));
    expect(indexLossIssue).toBeDefined();
  });

  it('deve detectar perda de indice em PHP de forma case-insensitive (WHEREDATE, whereyear)', () => {
    const code = `
      <?php
      $orders1 = Order::WHEREDATE('created_at', '2023-10-25')->get();
      $orders2 = Order::whereyear('created_at', '2023')->get();
    `;
    const issues = analyzePhpCode('test.php', code);
    
    expect(issues.length).toBe(2);
    expect(issues[0].message).toContain('WHEREDATE()');
    expect(issues[1].message).toContain('whereyear()');
  });
});
