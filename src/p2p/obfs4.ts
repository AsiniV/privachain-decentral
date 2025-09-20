import { createBoxStream, createUnboxStream } from "./salsa20box";

export function obfs4Transport(transport: any) {
  const secretHex = import.meta.env.VITE_OBFS4_SHARED_SECRET || import.meta.env.OBFS4_SHARED_SECRET || "changeme";
  const key = Buffer.from(secretHex, "hex");
  
  return {
    ...transport,
    dialer:  (ma: any, opts: any) =>
      transport.dialer(ma, opts).then((c: any) => createBoxStream(c, key)),
    listener: (opts: any) =>
      transport.listener({ ...opts, streamMuxer: (c: any) => createUnboxStream(c, key) })
  };
}