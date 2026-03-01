const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const handle = 'shiroshiro79'
    console.log(`Checking for profile with handle: ${handle}...`)

    const profile = await prisma.profile.findUnique({
        where: { handle },
        include: { user: true }
    })

    if (profile) {
        console.log('Profile found:', profile)
    } else {
        console.log('Profile NOT found.')
        // List all profiles to see what exists
        const allProfiles = await prisma.profile.findMany({
            include: { user: true }
        })
        console.log('Available handles:', allProfiles.map(p => `${p.handle} (${p.user.email})`))
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
