import { Injectable } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from 'node:crypto';

// AES-256-GCM authenticated encryption for integration config blobs.
// Format on disk: base64(iv):base64(authTag):base64(ciphertext).
// Key is derived from ENCRYPTION_KEY via SHA-256 so any sufficiently long
// passphrase works without manual hex juggling during bootstrap.
@Injectable()
export class CryptoService {
  private readonly algo = 'aes-256-gcm';

  private get key(): Buffer {
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret || secret.length < 16) {
      throw new Error('ENCRYPTION_KEY missing or too short (min 16 chars)');
    }
    return createHash('sha256').update(secret).digest();
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algo, this.key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
  }

  decrypt(blob: string): string {
    const [ivB64, tagB64, ctB64] = blob.split(':');
    if (!ivB64 || !tagB64 || !ctB64) throw new Error('Malformed ciphertext');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const ct = Buffer.from(ctB64, 'base64');
    const decipher = createDecipheriv(this.algo, this.key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(ct), decipher.final()]);
    return dec.toString('utf8');
  }

  encryptJson<T>(obj: T): string {
    return this.encrypt(JSON.stringify(obj));
  }

  decryptJson<T>(blob: string): T {
    return JSON.parse(this.decrypt(blob)) as T;
  }
}
