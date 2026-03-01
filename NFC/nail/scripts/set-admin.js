const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const email = 'nac1202@gmail.com' // User's email

    console.log(`Updating user ${email} to ADMIN...`)

    try {
        const user = await prisma.user.update({
            where: { email },
            data: { role: 'ADMIN' }
        })
        console.log('Success! User is now ADMIN:', user)
    } catch (e) {
        if (e.code === 'P2025') {
            console.error('Error: User not found. Please log in at least once first.')
        } else {
            console.error('Error updating user:', e)
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
