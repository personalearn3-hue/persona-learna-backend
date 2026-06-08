import { UserDocument } from './user.schema';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';

export function randomNumbers(length: number = 10) {
  const numbers: number[] = [];

  for (let i = 0; i < length; i++) {
    numbers.push(randomInt(10));
  }

  return numbers.join('');
}

export const preSave = async function (this: UserDocument) {
  if (this.isModified('password')) {
    const password = this.get('password');
    this.set('password', await bcrypt.hash(password, 10));
  }
};

export const preValidate = function (this: UserDocument) {
  if (this.isNew && !this.get('username')) {
    this.set('username', `user${randomNumbers()}`);
  }
};