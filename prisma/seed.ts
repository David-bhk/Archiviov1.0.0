import 'dotenv/config'

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

import { parseDemoSeedOptions } from '../scripts/demo-seed-options'

async function main() {
  const { password } = parseDemoSeedOptions(process.argv.slice(2))
  const hashedPassword = await bcrypt.hash(password, 10)
  const prisma = new PrismaClient()

  const departmentData = [
    { name: 'Administration', description: 'Administration générale' },
    { name: 'Comptabilité', description: 'Gestion financière' },
    { name: 'Ressources Humaines', description: 'Gestion du personnel' },
    { name: 'Marketing', description: 'Communication et marketing' },
    { name: 'IT', description: 'Informatique' },
  ]

  try {
    await prisma.$transaction(async (transaction) => {
      const departments = await Promise.all(
        departmentData.map((department) =>
          transaction.department.upsert({
            where: { name: department.name },
            update: { description: department.description },
            create: department,
          }),
        ),
      )
      const departmentIds = new Map(
        departments.map((department) => [department.name, department.id]),
      )

      const users = [
        {
          username: 'john.doe',
          email: 'john.doe@archivio.com',
          role: 'SUPERUSER' as const,
          department: 'Administration',
          firstName: 'John',
          lastName: 'Doe',
        },
        {
          username: 'marie.dubois',
          email: 'marie.dubois@archivio.com',
          role: 'ADMIN' as const,
          department: 'Comptabilité',
          firstName: 'Marie',
          lastName: 'Dubois',
        },
        {
          username: 'pierre.martin',
          email: 'pierre.martin@archivio.com',
          role: 'USER' as const,
          department: 'Ressources Humaines',
          firstName: 'Pierre',
          lastName: 'Martin',
        },
      ]

      for (const user of users) {
        const departmentId = departmentIds.get(user.department)
        if (!departmentId) {
          throw new Error('Département de démonstration introuvable.')
        }

        const data = { ...user, departmentId, password: hashedPassword }
        await transaction.user.upsert({
          where: { email: user.email },
          update: data,
          create: data,
        })
      }
    })

    console.log(
      'Seed SQLite de développement terminé : départements et comptes uniquement, sans métadonnée documentaire.',
    )
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Erreur inconnue.'
    console.error(`Échec du seed de développement : ${message}`)
    process.exit(1)
  })
