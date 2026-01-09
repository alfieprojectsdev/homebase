import { db } from './index';
import { organizations, residences, users, financialObligations } from './schema';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('🌱 Seeding database...');

  const [org] = await db
    .insert(organizations)
    .values({
      name: 'Sample Family',
    })
    .returning();

  console.log(`✅ Created organization: ${org.name} (ID: ${org.id})`);

  const [primaryResidence, secondaryResidence] = await db
    .insert(residences)
    .values([
      {
        orgId: org.id,
        name: 'Primary Residence',
        address: 'City A, State, Country',
      },
      {
        orgId: org.id,
        name: 'Secondary Residence',
        address: 'City B, Region, Country',
      },
    ])
    .returning();

  console.log(`✅ Created 2 residences: ${primaryResidence.name}, ${secondaryResidence.name}`);

  const hashedPassword = await bcrypt.hash('password123', 10);

  const [user] = await db
    .insert(users)
    .values({
      orgId: org.id,
      residenceId: primaryResidence.id,
      email: 'demo@example.com',
      password: hashedPassword,
      name: 'Test User',
      role: 'admin',
    })
    .returning();

  console.log(`✅ Created user: ${user.name} (email: ${user.email})`);

  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const tenDaysLater = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  const bills = await db
    .insert(financialObligations)
    .values([
      {
        orgId: org.id,
        residenceId: primaryResidence.id,
        name: 'Electricity Bill',
        amount: '450.00',
        dueDate: threeDaysLater,
        status: 'pending',
      },
      {
        orgId: org.id,
        residenceId: primaryResidence.id,
        name: 'Internet Bill',
        amount: '129.99',
        dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        status: 'overdue',
      },
      {
        orgId: org.id,
        residenceId: secondaryResidence.id,
        name: 'Water Bill',
        amount: '85.00',
        dueDate: tenDaysLater,
        status: 'pending',
      },
    ])
    .returning();

  console.log(`✅ Created ${bills.length} bills:`);
  bills.forEach((bill) => {
    console.log(`   - ${bill.name}: $${bill.amount} (${bill.status})`);
  });

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📝 Test credentials:');
  console.log('   Email: demo@example.com');
  console.log('   Password: password123');
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Error seeding database:', error);
  process.exit(1);
});
