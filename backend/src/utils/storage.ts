import { AwsClient } from "aws4fetch";
import path from "path";
import fs from "fs";

// Uploaded images go to Cloudflare R2 when it's configured (production), and
// to the local uploads/ folder otherwise (local dev). Render's free-tier disk
// is wiped on every redeploy, so anything written to uploads/ in production
// would vanish; R2 keeps it. Files already committed under uploads/ are still
// served by express.static either way.
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;
// Public base URL of the bucket (its r2.dev URL or a custom domain), no
// trailing slash. Stored image URLs are built from it.
const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");

const r2 =
    accountId && accessKeyId && secretAccessKey && bucket && publicUrl
        ? new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" })
        : null;

export const uploadsDirectory = path.resolve(process.cwd(), "uploads");

// Saves an image under `key` (e.g. "survivor/season_51/contestants/ori.png")
// and returns the URL to store: an absolute R2 URL, or "/uploads/<key>".
export async function saveUpload(key: string, body: Buffer, contentType: string): Promise<string> {
    if (r2) {
        const res = await r2.fetch(
            `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${encodeKey(key)}`,
            { method: "PUT", body: new Uint8Array(body), headers: { "Content-Type": contentType } },
        );
        if (!res.ok) {
            throw new Error(`R2 upload failed: ${res.status} ${await res.text()}`);
        }
        return `${publicUrl}/${encodeKey(key)}`;
    }

    const filePath = path.join(uploadsDirectory, ...key.split("/"));
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, body);
    return `/uploads/${key}`;
}

const encodeKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");
