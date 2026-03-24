import { writeFile } from "fs/promises";
import prettier from "prettier";

/**
 * Write JSON using the repo’s Prettier config (`.prettierrc.json`), so output
 * matches `prettier --write` (e.g. tabWidth 4 for `.json`).
 */
export async function writePrettierJson(filePath, data) {
    const text = JSON.stringify(data);
    const config = (await prettier.resolveConfig(filePath)) ?? {};
    const formatted = await prettier.format(text, {
        ...config,
        filepath: filePath,
        parser: "json",
    });
    await writeFile(filePath, formatted, "utf8");
}
