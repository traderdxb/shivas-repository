import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fleet.com' },
    update: {},
    create: {
      email: 'admin@fleet.com',
      password: hashedPassword,
      name: 'System Administrator',
      role: 'ADMIN',
      active: true,
    },
  });

  console.log('Created admin user:', admin.email);

  // Seed Static Data - Device Models
  const deviceModels = [
    'Teltonika FMC 130',
    'Teltonika FMC 125',
    'Teltonika FMC 920',
    'Teltonika FMC 150',
    'Teltonika FMC 230',
    'Teltonika FMM 130',
    'Teltonika FMM 125',
    'Teltonika FMB 920',
    'Teltonika FM1202',
    'JIMI JM-VL103M',
    'JIMI JM-VL03',
    'Ruptela Trace 5',
    'Ruptela Eco4+',
    'Ruptela Eco4+ ES',
    'Ruptela Eco4 Light+S',
  ];

  for (const model of deviceModels) {
    await prisma.staticData.upsert({
      where: { category_value: { category: 'device_model', value: model } },
      update: {},
      create: { category: 'device_model', value: model },
    });
  }

  console.log('Seeded device models');

  // Seed SIM Brands
  const simBrands = ['DU', 'Etisalat'];
  for (const brand of simBrands) {
    await prisma.staticData.upsert({
      where: { category_value: { category: 'sim_brand', value: brand } },
      update: {},
      create: { category: 'sim_brand', value: brand },
    });
  }

  console.log('Seeded SIM brands');

  // Seed Locations
  const locations = [
    'Dubai',
    'Abu Dhabi',
    'Ajman',
    'Ras Al Khaimah',
    'Sharjah',
    'Umm Al-Quwain',
  ];
  for (const location of locations) {
    await prisma.staticData.upsert({
      where: { category_value: { category: 'location', value: location } },
      update: {},
      create: { category: 'location', value: location },
    });
  }

  console.log('Seeded locations');

  // Seed Installers
  const installers = ['Miqdad', 'Rashid', 'Waseem'];
  for (const installer of installers) {
    await prisma.staticData.upsert({
      where: { category_value: { category: 'installer', value: installer } },
      update: {},
      create: { category: 'installer', value: installer },
    });
  }

  console.log('Seeded installers');

  // Seed Added By
  const addedByList = ['Sriparna', 'Easha', 'Ricardo', 'Jonathan'];
  for (const person of addedByList) {
    await prisma.staticData.upsert({
      where: { category_value: { category: 'added_by', value: person } },
      update: {},
      create: { category: 'added_by', value: person },
    });
  }

  console.log('Seeded added by list');

  // Seed Platforms
  const platforms = [
    'Securepath',
    'Securepath Premium',
    'AVL View',
    'ASATEEL',
    'Teletix',
    'AVL View & ASATEEL',
    'Fleetcop',
  ];
  for (const platform of platforms) {
    await prisma.staticData.upsert({
      where: { category_value: { category: 'platform', value: platform } },
      update: {},
      create: { category: 'platform', value: platform },
    });
  }

  console.log('Seeded platforms');

  // Seed Accessories
  const accessories = [
    'Immobilizer',
    'Buzzer',
    'I-Button',
    'Eye Sensor',
    'Fuel Sensor',
    'Temperature Sensor',
    'CANBUS L200',
  ];
  for (const accessory of accessories) {
    await prisma.staticData.upsert({
      where: { category_value: { category: 'accessory', value: accessory } },
      update: {},
      create: { category: 'accessory', value: accessory },
    });
  }

  console.log('Seeded accessories');

  console.log('Database seeding completed!');
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
