// Makes the credentials of the two roles of the foundation, with node:crypto only:
//   generatePassword()      a 32 character password for n8n_leads
//   scramSha256Verifier()   the SCRAM-SHA-256 verifier of a password, so `alter role ... password '<verifier>'` never sends
//                           the clear text through /pg/query (a statement the server may log)
//   mintRoleToken()         the short lived JWT that the news job sends to the REST API as the role news_writer
// None of them prints anything. The caller decides where the values go (Acessos/, a GitHub secret), never the repository.
import { createHash, createHmac, pbkdf2Sync, randomBytes, randomInt } from 'node:crypto';

const PASSWORD_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const PASSWORD_LENGTH = 32;
const SCRAM_ITERATIONS = 4096;
const SCRAM_SALT_BYTES = 16;
const SCRAM_KEY_BYTES = 32;
const TOKEN_ROLE = 'news_writer';
const TOKEN_DEFAULT_DAYS = 365;
// A token that lasts years is a credential nobody remembers to rotate: five years was the first plan, a year is the default now.
const TOKEN_MAX_DAYS = 1825;
const SECONDS_PER_DAY = 86_400;
const JWT_SECRET_MIN_LENGTH = 32;

/** 32 characters of letters and digits, drawn uniformly (randomInt rejects the bias a modulo would add). */
export function generatePassword() {
  return Array.from({ length: PASSWORD_LENGTH }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join('');
}

const hmac = (key, data) => createHmac('sha256', key).update(data).digest();

/**
 * The verifier PostgreSQL stores for a SCRAM-SHA-256 password (RFC 5802, RFC 7677):
 * `SCRAM-SHA-256$<iterations>:<salt>$<StoredKey>:<ServerKey>`, the keys and the salt in base64.
 * The password must be printable ASCII, where the SASLprep normalisation PostgreSQL applies changes nothing.
 * @param {string} password
 * @param {number} [iterations]
 * @param {Buffer} [salt] only for a test with a known vector
 */
export function scramSha256Verifier(password, iterations = SCRAM_ITERATIONS, salt = randomBytes(SCRAM_SALT_BYTES)) {
  if (typeof password !== 'string' || password === '' || !/^[\x20-\x7e]+$/.test(password)) {
    throw new Error('the password must be a non empty string of printable ASCII characters');
  }
  if (!Number.isInteger(iterations) || iterations < 1)
    throw new Error('the iteration count must be a positive integer');
  const salted = pbkdf2Sync(password, salt, iterations, SCRAM_KEY_BYTES, 'sha256');
  const storedKey = createHash('sha256').update(hmac(salted, 'Client Key')).digest();
  const serverKey = hmac(salted, 'Server Key');
  return `SCRAM-SHA-256$${iterations}:${salt.toString('base64')}$${storedKey.toString('base64')}:${serverKey.toString('base64')}`;
}

const base64url = (value) => Buffer.from(value).toString('base64url');

/**
 * An HS256 JWT for PostgREST: it switches the request into the role `news_writer`, which can only write `articles`.
 * @param {{ jwtSecret: string; role: 'news_writer'; days?: number; now?: () => Date }} options
 */
export function mintRoleToken({ jwtSecret, role, days = TOKEN_DEFAULT_DAYS, now = () => new Date() }) {
  if (role !== TOKEN_ROLE) throw new Error(`a token can only be minted for the role ${TOKEN_ROLE}`);
  if (typeof jwtSecret !== 'string' || jwtSecret.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(`the JWT secret must be at least ${JWT_SECRET_MIN_LENGTH} characters`);
  }
  if (!Number.isInteger(days) || days < 1 || days > TOKEN_MAX_DAYS) {
    throw new Error(`the validity must be a whole number of days from 1 to ${TOKEN_MAX_DAYS}`);
  }
  const issuedAt = Math.floor(now().getTime() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({ role, iss: 'supabase', iat: issuedAt, exp: issuedAt + days * SECONDS_PER_DAY }),
  );
  const signature = base64url(hmac(jwtSecret, `${header}.${payload}`));
  return `${header}.${payload}.${signature}`;
}
