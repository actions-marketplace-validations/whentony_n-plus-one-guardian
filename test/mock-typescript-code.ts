// Mock TypeScript Code - Prisma / TypeORM / Sequelize Anti-patterns

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function report(users: any[]) {
  // Anti-pattern 1: N+1 clássico com findMany dentro do loop (Error)
  for (const user of users) {
    const orders = await prisma.order.findMany({
      where: { userId: user.id }
    });
  }

  // Anti-pattern 2: N+1 com findUnique dentro do loop (Error)
  for (const user of users) {
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id }
    });
  }
}

export async function reportCast(sequelize: any) {
  // Anti-pattern 3: Perda de índice usando sequelize.fn() (Warning)
  const users = await sequelize.models.User.findAll({
    where: sequelize.where(
      sequelize.fn('date', sequelize.col('created_at')),
      '2023-10-25'
    )
  });

  // Anti-pattern 4: Perda de índice por queryRaw com CAST manual (Warning)
  const rawUsers = await prisma.$queryRaw`SELECT * FROM users WHERE CAST(id AS TEXT) = '1'`;
}
