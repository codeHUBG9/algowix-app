import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const keysDir = resolve(process.cwd(), "keys");
mkdirSync(keysDir, { recursive: true });

const privatePath = resolve(keysDir, "private.pem");
const publicPath = resolve(keysDir, "public.pem");

if (existsSync(privatePath) && existsSync(publicPath)) {
  console.log("Dev JWT keypair already exists at ./keys — skipping generation.");
  process.exit(0);
}

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 4096,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

writeFileSync(privatePath, privateKey);
writeFileSync(publicPath, publicKey);

console.log(`Generated dev RS256 keypair:\n  ${privatePath}\n  ${publicPath}`);
