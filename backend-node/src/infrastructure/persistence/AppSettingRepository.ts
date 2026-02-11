import { injectable } from 'tsyringe';
import { eq } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { appSettingsTable } from '../db/drizzle/schema';
import { IAppSettingRepository } from '../../application/interfaces/IAppSettingRepository';

@injectable()
export class AppSettingRepository implements IAppSettingRepository {
  async findByKey(key: string): Promise<string | null> {
    const [setting] = await db
      .select()
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, key))
      .limit(1);

    return setting?.value || null;
  }

  async upsert(key: string, value: string): Promise<void> {
    await db
      .insert(appSettingsTable)
      .values({
        key,
        value,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettingsTable.key,
        set: {
          value,
          updatedAt: new Date(),
        },
      });
  }
}

