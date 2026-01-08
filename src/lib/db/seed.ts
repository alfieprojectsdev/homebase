import { db } from './index';
import { organizations, residences, users, financialObligations } from './schema';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('🌱 Seeding database...');

  const [org] = await db
    .insert(organizations)
    .values({
      name: 'Dev Family',
    })
    .returning();

  console.log(`✅ Created organization: ${org.name} (ID: ${org.id})`);

  const [qcResidence, magalangResidence] = await db
    .insert(residences)
    .values([
      {
        orgId: org.id,
        name: 'QC Apartment',
        address: 'Quezon City, Metro Manila, Philippines',
      },
      {
        orgId: org.id,
        name: 'Magalang House',
        address: 'Magalang, Pampanga, Philippines',
      },
    ])
    .returning();

  console.log(`✅ Created 2 residences: ${qcResidence.name}, ${magalangResidence.name}`);

  const hashedPassword = await bcrypt.hash('password123', 10);

  const [user] = await db
    .insert(users)
    .values({
      orgId: org.id,
      residenceId: qcResidence.id,
      email: 'test@devfamily.com',
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
        residenceId: qcResidence.id,
        name: 'Electricity Bill',
        amount: '4500.00',
        dueDate: threeDaysLater,
        status: 'pending',
      },
      {
        orgId: org.id,
        residenceId: qcResidence.id,
        name: 'Internet Bill',
        amount: '1299.00',
        dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        status: 'overdue',
      },
      {
        orgId: org.id,
        residenceId: magalangResidence.id,
        name: 'Water Bill',
        amount: '850.00',
        dueDate: tenDaysLater,
        status: 'pending',
      },
    ])
    .returning();

  console.log(`✅ Created ${bills.length} bills:`);
  bills.forEach((bill) => {
    console.log(`   - ${bill.name}: ₱${bill.amount} (${bill.status})`);
  });

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📝 Test credentials:');
  console.log('   Email: test@devfamily.com');
  console.log('   Password: password123');
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Error seeding database:', error);
  process.exit(1);
});
