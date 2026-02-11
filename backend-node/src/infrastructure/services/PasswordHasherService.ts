import { injectable } from 'tsyringe';
import * as bcrypt from 'bcryptjs';

export interface IPasswordHasherService {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

@injectable()
export class PasswordHasherService implements IPasswordHasherService {
  private readonly SALT_ROUNDS = 10;

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

