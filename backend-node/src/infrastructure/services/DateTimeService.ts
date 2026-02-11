import { injectable } from 'tsyringe';

export interface IDateTimeService {
  now(): Date;
}

@injectable()
export class DateTimeService implements IDateTimeService {
  now(): Date {
    return new Date();
  }
}

