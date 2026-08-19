import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, getPosts } from "@/lib/posts";

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-24">
      <Link href="/blog" className="underline opacity-70">← All posts</Link>
      <h1 className="mt-8 text-4xl font-bold tracking-tight">{post.title}</h1>
      {post.date && <p className="mt-2 text-sm opacity-60">{post.date}</p>}
      <article
        className="post-body mt-10"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />
    </main>
  );
}
