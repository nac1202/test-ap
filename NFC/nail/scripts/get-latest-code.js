const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const token = await prisma.verificationToken.findFirst({
        orderBy: { expires: 'desc' }
    })
    if (token) {
        console.log('Latest Token:', token.token)
        console.log('Identifier:', token.identifier)
        console.log('Expires:', token.expires)
    } else {
        console.log('No tokens found')
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
