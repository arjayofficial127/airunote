/**
 * Database seed script
 * Run with: tsx src/infrastructure/db/drizzle/seed.ts
 */
import { db } from './client';
import { rolesTable, appSettingsTable, collectionsTable, collectionFieldsTable } from './schema';
import * as dotenv from 'dotenv';

// Load .env from backend-node directory (where script is run from)
dotenv.config({ path: '.env' });

async function seed() {
  console.log('Seeding database...');

  try {
    // Seed roles
    await db.insert(rolesTable).values([
      { id: 1, name: 'Admin', code: 'ADMIN' },
      { id: 2, name: 'Member', code: 'MEMBER' },
      { id: 3, name: 'Viewer', code: 'VIEWER' },
    ]).onConflictDoNothing();

    console.log('✓ Roles seeded');

    // Seed registration secret
    const registrationSecret = process.env.REGISTRATION_SECRET || 'changeme-registration-secret';
    await db.insert(appSettingsTable).values({
      key: 'registration_secret',
      value: registrationSecret,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: appSettingsTable.key,
      set: {
        value: registrationSecret,
        updatedAt: new Date(),
      },
    });

    console.log('✓ Registration secret seeded');
    console.log(`  Secret: ${registrationSecret}`);

    // Optional: Seed demo collections (only if SEED_DEMO_COLLECTIONS=true and ORG_ID is provided)
    if (process.env.SEED_DEMO_COLLECTIONS === 'true' && process.env.ORG_ID) {
      await seedDemoCollections(process.env.ORG_ID);
    }

    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

async function seedDemoCollections(orgId: string) {
  console.log(`\nSeeding demo collections for org: ${orgId}...`);

  try {
    // Create "clients" collection
    const [clientsCollection] = await db
      .insert(collectionsTable)
      .values({
        orgId,
        slug: 'clients',
        name: 'Clients',
        description: 'Customer and client management',
        icon: '👤',
        color: 'blue',
        visibility: 'org',
        createdByUserId: orgId, // Using orgId as placeholder - should be actual user ID
        tableCode: `col_${orgId.substring(0, 8)}_clients`,
        storageMode: 'single_table',
        physicalTable: null,
      })
      .returning()
      .onConflictDoNothing();

    if (clientsCollection) {
      // Add fields for clients collection
      await db.insert(collectionFieldsTable).values([
        {
          collectionId: clientsCollection.id,
          key: 'name',
          label: 'Name',
          type: 'text',
          isRequired: true,
          order: 1,
          config: {},
        },
        {
          collectionId: clientsCollection.id,
          key: 'email',
          label: 'Email',
          type: 'text',
          isRequired: false,
          order: 2,
          config: {},
        },
        {
          collectionId: clientsCollection.id,
          key: 'status',
          label: 'Status',
          type: 'select',
          isRequired: true,
          order: 3,
          config: {
            options: ['lead', 'active', 'churned'],
          },
        },
        {
          collectionId: clientsCollection.id,
          key: 'value',
          label: 'Value',
          type: 'number',
          isRequired: false,
          order: 4,
          config: {},
        },
      ]);
      console.log('✓ Clients collection seeded');
    }

    // Create "invoices" collection
    const [invoicesCollection] = await db
      .insert(collectionsTable)
      .values({
        orgId,
        slug: 'invoices',
        name: 'Invoices',
        description: 'Invoice and billing management',
        icon: '📄',
        color: 'green',
        visibility: 'org',
        createdByUserId: orgId, // Using orgId as placeholder - should be actual user ID
        tableCode: `col_${orgId.substring(0, 8)}_invoices`,
        storageMode: 'single_table',
        physicalTable: null,
      })
      .returning()
      .onConflictDoNothing();

    if (invoicesCollection) {
      // Add fields for invoices collection
      await db.insert(collectionFieldsTable).values([
        {
          collectionId: invoicesCollection.id,
          key: 'invoiceNumber',
          label: 'Invoice Number',
          type: 'text',
          isRequired: true,
          order: 1,
          config: {},
        },
        {
          collectionId: invoicesCollection.id,
          key: 'amount',
          label: 'Amount',
          type: 'number',
          isRequired: true,
          order: 2,
          config: {},
        },
        {
          collectionId: invoicesCollection.id,
          key: 'status',
          label: 'Status',
          type: 'select',
          isRequired: true,
          order: 3,
          config: {
            options: ['draft', 'sent', 'paid', 'overdue'],
          },
        },
        {
          collectionId: invoicesCollection.id,
          key: 'dueDate',
          label: 'Due Date',
          type: 'date',
          isRequired: false,
          order: 4,
          config: {},
        },
      ]);
      console.log('✓ Invoices collection seeded');
    }
  } catch (error) {
    console.error('Failed to seed demo collections:', error);
    throw error;
  }
}

seed();

