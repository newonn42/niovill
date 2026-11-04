/* 휴대폰 웹 알림 (Web Push)
   - 서버 열쇠(VAPID)는 처음 쓸 때 자동으로 만들어 settings 표에 저장합니다. 따로 설정할 것이 없습니다.
   - 알림 내용은 RFC 8291(aes128gcm) 방식으로 암호화해 휴대폰 회사(구글·애플) 서버로 보냅니다. */
import { getSetting, setSetting } from './telegram.js';

const enc = new TextEncoder();

export function b64u(bytes) {
  const arr = new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function fromB64u(str) {
  const s = atob(String(str).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(str).length + 3) % 4));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
function concat(...parts) {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/* ── 서버 열쇠 (VAPID) ── */
export async function getVapid(db) {
  const saved = await getSetting(db, 'vapid');
  if (saved) {
    try {
      const v = JSON.parse(saved);
      if (v.publicKey && v.privateJwk) return v;
    } catch (e) { /* 새로 만듦 */ }
  }
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const v = { publicKey: b64u(pub), privateJwk };
  // 동시에 두 번 만들어지는 경우를 막기 위해, 이미 있으면 저장하지 않고 그것을 씀
  await db.prepare("INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('vapid', ?, datetime('now'))").bind(JSON.stringify(v)).run();
  return JSON.parse(await getSetting(db, 'vapid'));
}

async function vapidHeader(vapid, endpoint, subject) {
  const aud = new URL(endpoint).origin;
  const header = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const key = await crypto.subtle.importKey('jwk', vapid.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(header + '.' + payload));
  return 'vapid t=' + header + '.' + payload + '.' + b64u(sig) + ', k=' + vapid.publicKey;
}

/* ── 내용 암호화 (RFC 8291 / RFC 8188 aes128gcm) ── */
async function hkdf(salt, ikm, info, bytes) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
}

export async function encryptPayload(p256dhB64, authB64, plaintext, saltIn, serverKeysIn) {
  const uaPublic = fromB64u(p256dhB64);
  const authSecret = fromB64u(authB64);
  if (uaPublic.length !== 65 || authSecret.length < 16) throw new Error('bad subscription keys');
  const serverKeys = serverKeysIn || (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']));
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, serverKeys.privateKey, 256));

  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, shared, keyInfo, 32);
  const salt = saltIn || crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  const data = concat(enc.encode(plaintext), new Uint8Array([2])); // 마지막 레코드 표시
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, data));

  const rs = new Uint8Array([0, 0, 16, 0]); // 레코드 크기 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher);
}

/* ── 보내기 ── */
export async function sendPush(env, sub, message, subject) {
  const vapid = await getVapid(env.DB);
  const body = await encryptPayload(sub.p256dh, sub.auth, JSON.stringify(message));
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidHeader(vapid, sub.endpoint, subject),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'high'
    },
    body
  });
  return res.status;
}

export async function subjectFor(env) {
  const site = await getSetting(env.DB, 'site_url');
  return site && site.startsWith('https://') ? site : 'mailto:admin@example.com';
}

// adminId를 주면 그 사람 기기에만 (테스트용)
export async function pushToAll(env, message, adminId) {
  const q = adminId
    ? env.DB.prepare('SELECT endpoint, p256dh, auth FROM push_subs WHERE admin_id = ?').bind(adminId)
    : env.DB.prepare('SELECT endpoint, p256dh, auth FROM push_subs');
  const { results } = await q.all();
  const subject = await subjectFor(env);
  let sent = 0;
  let failed = 0;
  for (const sub of results || []) {
    try {
      const status = await sendPush(env, sub, message, subject);
      if (status >= 200 && status < 300) {
        sent += 1;
        await env.DB.prepare("UPDATE push_subs SET last_ok = datetime('now') WHERE endpoint = ?").bind(sub.endpoint).run();
      } else {
        failed += 1;
        console.log('push failed status', status);
        // 404 / 410: 기기에서 알림이 꺼짐 → 목록에서 삭제
        if (status === 404 || status === 410) await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ?').bind(sub.endpoint).run();
      }
    } catch (e) {
      failed += 1;
      console.log('push error:', e && e.message);
    }
  }
  return { sent, failed, total: (results || []).length };
}

export { getSetting, setSetting };
