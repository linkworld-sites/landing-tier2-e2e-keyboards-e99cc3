import Link from "next/link";
import { getPosts } from "@/lib/posts";

export const metadata = { title: "Blog" };

/**
 * Blog index — lists every post from content/posts/. Ships with neutral
 * styling on purpose: restyle to the site's design tokens during the build.
 */
export default function BlogIndex() {
  const posts = getPosts();
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-24">
      <h1 className="text-4xl font-bold tracking-tight">Blog</h1>
      {posts.length === 0 ? (
        <p className="mt-8 opacity-70">New stories are on the way — check back soon.</p>
      ) : (
        <ul className="mt-12 space-y-10">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} className="group block">
                {p.date && <p className="text-sm opacity-60">{p.date}</p>}
                <h2 className="mt-1 text-2xl font-semibold group-hover:underline">{p.title}</h2>
                {p.description && <p className="mt-2 opacity-70">{p.description}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-16">
        <Link href="/" className="underline opacity-70">← Home</Link>
      </p>
    </main>
  );
}
