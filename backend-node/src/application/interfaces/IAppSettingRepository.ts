export interface IAppSettingRepository {
  findByKey(key: string): Promise<string | null>;
  upsert(key: string, value: string): Promise<void>;
}

