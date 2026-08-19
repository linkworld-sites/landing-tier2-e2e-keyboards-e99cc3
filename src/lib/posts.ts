import fs from "fs";
import path from "path";
import { marked } from "marked";

/**
 * Data-driven blog: every markdown file in content/posts/ is a post.
 * Publishing = adding ONE .md file (frontmatter: title, date, description) —
 * it is auto-indexed on /blog and auto-linked. A malformed file is skipped,
 * never crashes the site.
 */
export interface Post {
  slug: string;
  title: string;
  date: string;
  description: string;
  html: string;
}

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    meta[key] = val;
  }
  return { meta, body: raw.slice(m[0].length) };
}

export function getPosts(): Post[] {
  let files: string[] = [];
  try {
    files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  const posts: Post[] = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
      const { meta, body } = parseFrontmatter(raw);
      const slug = (meta.slug || file.replace(/\.md$/, "")).toLowerCase();
      posts.push({
        slug,
        title: meta.title || slug,
        date: meta.date || "",
        description: meta.description || "",
        html: marked.parse(body, { async: false }) as string,
      });
    } catch {
      continue;
    }
  }
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(slug: string): Post | undefined {
  return getPosts().find((p) => p.slug === slug);
}
