const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
p.settings
  .findMany()
  .then((rs) => {
    console.log(
      JSON.stringify(
        rs.map((r) => ({
          id: r.id,
          userId: r.userId,
          watchedRepos: r.watchedRepos,
          watchedReposLife: r.watchedReposLife,
          defaultScope: r.defaultScope,
        })),
        null,
        2,
      ),
    )
    return p.$disconnect()
  })
  .catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
