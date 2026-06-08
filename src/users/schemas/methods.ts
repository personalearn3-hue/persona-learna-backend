import { UserDocument } from './user.schema';
import * as bcrypt from 'bcrypt';

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

export const userMethods = [verifyHash];