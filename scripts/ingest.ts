import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { checkAccess } from "../src/core/agents/access-agent";
import { ingestDocument } from "../src/core/ingestion/ingest";
import { closeDb } from "../src/db/client";
async function main() {
  const access = await checkAccess("admin", "demo");
  for (const file of (await readdir("knowledge")).filter((f) =>
    f.endsWith(".md"),
  ))
    console.log(
      file,
      await ingestDocument(
        {
          title: file,
          source: file,
          content: await readFile(`knowledge/${file}`, "utf8"),
          mimeType: "text/markdown",
        },
        access,
      ),
    );
}
main()
  .then(closeDb)
  .catch(async (e) => {
    console.error(e.message);
    await closeDb();
    process.exitCode = 1;
  });
