import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const runtimeRoots = [
  "api/connectrobot",
  "api/networking-dna",
  "server/connectrobot",
  "server/networking-dna",
];
const importSpecifierPattern =
  /\bfrom\s+["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const absolutePath = path.join(directory, entry);
    if (statSync(absolutePath).isDirectory()) {
      return collectTypeScriptFiles(absolutePath);
    }

    return absolutePath.endsWith(".ts") ? [absolutePath] : [];
  });
}

describe("Networking DNA runtime module specifiers", () => {
  it("uses explicit extensions for deployed relative ESM imports", () => {
    const missingExtensions = runtimeRoots.flatMap((root) =>
      collectTypeScriptFiles(root).flatMap((file) => {
        const source = readFileSync(file, "utf8");
        return [...source.matchAll(importSpecifierPattern)]
          .map((match) => match[1] ?? match[2])
          .filter((specifier) => specifier.startsWith("."))
          .filter((specifier) => path.extname(specifier) === "")
          .map((specifier) => `${file}: ${specifier}`);
      }),
    );

    expect(missingExtensions).toEqual([]);
  });
});
