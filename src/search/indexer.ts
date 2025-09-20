import { createOrbitDB } from "@orbitdb/core";
import { createHelia } from "helia";

export async function createIndex() {
  const helia = await createHelia();
  const orbitdb = await createOrbitDB({ ipfs: helia });
  const index = await orbitdb.docs("search", { indexBy: "url" });
  return index;
}

export async function indexPage(index: any, url: string, text: string) {
  await index.put({ url, text });
}

export async function search(index: any, query: string) {
  return index.query((doc: any) => doc.text.toLowerCase().includes(query.toLowerCase()));
}