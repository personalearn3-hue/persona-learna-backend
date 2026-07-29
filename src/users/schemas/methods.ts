import { UserDocument } from './user.schema';
import * as bcrypt from 'bcrypt';
import { randomNumbers } from './middleware';
import {
  VERIFICATION_CODE_LENGTH,
  VERIFICATION_CODE_TTL_MS,
  VERIFICATION_MAX_ATTEMPTS,
} from '../constants';

type VerifyHash = (
  this: UserDocument,
  path: string,
  plain: string,
) => Promise<boolean>;

type GenerateNonce = (
  this: UserDocument,
  length?: number,
  expiresIn?: number,
) => Promise<string>;

type VerifyNonce = (
  this: UserDocument,
  nonce: string,
) => Promise<boolean | 'expired'>;

export interface UserMethods {
  verifyHash: VerifyHash;
  generateNonce: GenerateNonce;
  verifyNonce: VerifyNonce;
}

const verifyHash: VerifyHash = async function (path, plain) {
  return await bcrypt.compare(plain, this.get(path));
};

const generateNonce: GenerateNonce = async function (
  length = VERIFICATION_CODE_LENGTH,
  expiresIn = VERIFICATION_CODE_TTL_MS,
) {
  const code = randomNumbers(length);
  const codeHash = await bcrypt.hash(code, 10);

  this.set('verification', {
    codeHash,
    expiresAt: new Date(Date.now() + expiresIn),
    attempts: 0,
    lastSentAt: new Date(),
  });
  await this.save();

  return code;
};

const verifyNonce: VerifyNonce = async function (nonce) {
  // `verification` fields are select:false — callers must fetch the user
  // with `.select('+verification.codeHash +verification.expiresAt +verification.attempts')`
  // for these values to be present here.
  const verification = this.get('verification') as
    | { codeHash?: string; expiresAt?: Date; attempts: number }
    | undefined;

  if (!verification?.codeHash) return 'expired';
  if (verification.attempts >= VERIFICATION_MAX_ATTEMPTS) return 'expired';
  if (verification.expiresAt && verification.expiresAt.getTime() < Date.now()) {
    return 'expired';
  }

  const isMatch = await bcrypt.compare(nonce, verification.codeHash);

  if (!isMatch) {
    this.set('verification.attempts', verification.attempts + 1);
    await this.save();
    return false;
  }

  return true;
};

export const userMethods = [verifyHash, generateNonce, verifyNonce];
