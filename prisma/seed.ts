import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create departments
  const departments = await Promise.all([
    prisma.department.create({
      data: {
        name: 'Administration',
        description: 'Administration générale',
      },
    }),
    prisma.department.create({
      data: {
        name: 'Comptabilité',
        description: 'Gestion financière',
      },
    }),
    prisma.department.create({
      data: {
        name: 'Ressources Humaines',
        description: 'Gestion du personnel',
      },
    }),
    prisma.department.create({
      data: {
        name: 'Marketing',
        description: 'Communication et marketing',
      },
    }),
    prisma.department.create({
      data: {
        name: 'IT',
        description: 'Informatique',
      },
    }),
  ])

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10)
  
  const users = await Promise.all([
    prisma.user.create({
      data: {
        username: 'john.doe',
        email: 'john.doe@archivio.com',
        password: hashedPassword,
        role: 'SUPERUSER',
        department: 'Administration',
        firstName: 'John',
        lastName: 'Doe',
      },
    }),
    prisma.user.create({
      data: {
        username: 'marie.dubois',
        email: 'marie.dubois@archivio.com',
        password: hashedPassword,
        role: 'ADMIN',
        department: 'Comptabilité',
        firstName: 'Marie',
        lastName: 'Dubois',
      },
    }),
    prisma.user.create({
      data: {
        username: 'pierre.martin',
        email: 'pierre.martin@archivio.com',
        password: hashedPassword,
        role: 'USER',
        department: 'Ressources Humaines',
        firstName: 'Pierre',
        lastName: 'Martin',
      },
    }),
  ])

  // Create some sample files
  await Promise.all([
    prisma.file.create({
      data: {
        filename: 'rapport_q1_2024.pdf',
        originalName: 'Rapport_Q1_2024.pdf',
        fileType: 'pdf',
        fileSize: 2400000,
        filePath: '/uploads/rapport_q1_2024.pdf',
        uploadedBy: users[1].id, // Marie Dubois
        department: 'Comptabilité',
        category: 'Rapport',
        description: 'Rapport trimestriel Q1 2024',
      },
    }),
    prisma.file.create({
      data: {
        filename: 'manuel_procedures.docx',
        originalName: 'Manuel_Procedures.docx',
        fileType: 'docx',
        fileSize: 1800000,
        filePath: '/uploads/manuel_procedures.docx',
        uploadedBy: users[2].id, // Pierre Martin
        department: 'Ressources Humaines',
        category: 'Manuel',
        description: 'Manuel des procédures internes',
      },
    }),
    prisma.file.create({
      data: {
        filename: 'budget_2024.xlsx',
        originalName: 'Budget_2024.xlsx',
        fileType: 'xlsx',
        fileSize: 3200000,
        filePath: '/uploads/budget_2024.xlsx',
        uploadedBy: users[1].id, // Marie Dubois
        department: 'Comptabilité',
        category: 'Budget',
        description: 'Budget prévisionnel 2024',
      },
    }),
  ])

  console.log('Seed data created successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })