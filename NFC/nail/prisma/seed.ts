import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // 1. Create Admin User
  const adminEmail = 'admin@example.com';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });
  console.log({ admin });

  // 2. Create Test Profile (for the ACTIVE tag)
  const testUserEmail = 'test@example.com';
  const testUser = await prisma.user.upsert({
    where: { email: testUserEmail },
    update: {},
    create: {
      email: testUserEmail,
      name: 'Test Profile User',
      role: 'USER',
      profile: {
        create: {
          handle: 'test',
          displayName: 'Test User',
          linksJson: JSON.stringify([
            { type: 'instagram', label: 'Instagram', url: 'https://instagram.com', order: 1 },
            { type: 'website', label: 'Website', url: 'https://example.com', order: 2 },
          ]),
        },
      },
    },
    include: { profile: true },
  });
  console.log({ testUser });

  // 3. Create Tags
  const statuses = [
    ...Array(5).fill('CREATED'),
    ...Array(3).fill('SHIPPED'),
    'ACTIVE',
    'REPLACED',
  ];

  for (let i = 0; i < statuses.length; i++) {
    const status = statuses[i];
    // Generate pseudorandom tagCode (12 chars)
    const tagCode = `TEST${i.toString().padStart(8, '0')}`; // e.g., TEST00000000

    let tagData: any = {
      tagCode,
      status,
      events: {
        create: { event: 'ISSUED', note: 'Seeding' },
      },
    };

    if (status === 'ACTIVE') {
      tagData.profileId = testUser.profile?.id;
      // Also Add ACTIVATED event
      tagData.events.create = [
        { event: 'ISSUED', note: 'Seeding' },
        { event: 'ACTIVATED', note: 'Seeding Initial Activation' }
      ];
      // Update profile's activeTagId
      // We accept that we might need to update the profile after creating the tag or activeTagId in profile is just 'last active'.
      // For schema simplicity, let's keep activeTagId in Profile manually synced or derived.
    }

    if (status === 'REPLACED') {
      // Logic for replaced not fully mocked here without a successor, but creating unconnected REPLACED tag
      tagData.events.create = [
        { event: 'ISSUED', note: 'Seeding' },
        { event: 'REPLACED', note: 'Seeding Replacement' }
      ];
    }

    const tag = await prisma.tag.upsert({
      where: { tagCode },
      update: {},
      create: tagData,
    });

    console.log(`Created Tag: ${tag.tagCode} [${tag.status}]`);

    if (status === 'ACTIVE' && testUser.profile) {
      await prisma.profile.update({
        where: { id: testUser.profile.id },
        data: { activeTagId: tag.id }
      });
    }
  }

  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
