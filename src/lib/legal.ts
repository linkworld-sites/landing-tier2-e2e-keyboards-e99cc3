import fs from "fs";
import path from "path";
import { marked } from "marked";

// Legal pages are markdown files in content/legal/<slug>.md, generated from the
// company's legal entity data (Impressum/Datenschutz/Cookies for EU, Privacy/
// Cookies otherwise) and dropped in by the build. This reader mirrors the blog.
const LEGAL_DIR = path.join(process.cwd(), "content", "legal");

function parseFrontmatter(raw: string): { title: string; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { title: "", body: raw };
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { title: meta.title || "", body: raw.slice(m[0].length) };
}

export function getLegalSlugs(): string[] {
  try {
    return fs
      .readdirSync(LEGAL_DIR)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""));
  } catch {
    return [];
  }
}

export function getLegalPage(
  slug: string,
): { slug: string; title: string; html: string } | null {
  try {
    const raw = fs.readFileSync(path.join(LEGAL_DIR, `${slug}.md`), "utf8");
    const { title, body } = parseFrontmatter(raw);
    return { slug, title, html: marked.parse(body) as string };
  } catch {
    return null;
  }
}

export function getLegalPages(): { slug: string; title: string; html: string }[] {
  return getLegalSlugs()
    .map(getLegalPage)
    .filter((p): p is { slug: string; title: string; html: string } => !!p);
}
