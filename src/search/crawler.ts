import { createHelia } from "helia";
import { unixfs } from "@helia/unixfs";
import { createIndex, indexPage } from "./indexer";
import { CID } from "multiformats/cid";
import { concat } from "uint8arrays/concat";

const helia = await createHelia();
const fs = unixfs(helia);
const index = await createIndex();

export async function crawl(cidString: string) {
  const cid = CID.parse(cidString);
  const chunks: Uint8Array[] = [];
  for await (const chunk of fs.cat(cid)) chunks.push(chunk);
  const text = new TextDecoder().decode(concat(chunks));
  await indexPage(index, `ipfs://${cidString}`, text);
}

// example – index this guide itself
// crawl("bafybeigprivachainguidecid");