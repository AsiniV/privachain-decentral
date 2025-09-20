import { box, randomBytes } from "tweetnacl";

const nonceLen = 24;

export function createBoxStream(stream: any, key: Uint8Array) {
  return {
    ...stream,
    write: (chunk: Uint8Array) => {
      const nonce = randomBytes(nonceLen);
      const encrypted = box(chunk, nonce, key);
      return stream.write(Buffer.concat([nonce, encrypted]));
    }
  };
}

export function createUnboxStream(stream: any, key: Uint8Array) {
  return {
    ...stream,
    read: () => {
      const buf = stream.read();
      if (!buf) return buf;
      const nonce = buf.subarray(0, nonceLen);
      const ct = buf.subarray(nonceLen);
      const pt = box.open(ct, nonce, key);
      if (!pt) throw new Error("decrypt failed");
      return pt;
    }
  };
}