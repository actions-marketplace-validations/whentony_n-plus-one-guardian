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

});
