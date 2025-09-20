import { createBoxStream, createUnboxStream } from "./salsa20box";
const key = Buffer.from(process.env.OBFS4_SHARED_SECRET!, "hex");

export function obfs4Transport(transport: any) {
  return {
    ...transport,
    dialer:  (ma: any, opts: any) =>
      transport.dialer(ma, opts).then((c: any) => createBoxStream(c, key)),
    listener: (opts: any) =>
      transport.listener({ ...opts, streamMuxer: (c: any) => createUnboxStream(c, key) })
  };
}