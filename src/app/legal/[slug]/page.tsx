import { notFound } from "next/navigation";
import { getLegalPage, getLegalSlugs } from "@/lib/legal";

export function generateStaticParams() {
  return getLegalSlugs().map((slug) => ({ slug }));
}

export const dynamicParams = false;

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getLegalPage(slug);
  if (!page) notFound();
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 md:py-32">
      <article
        className="post-body"
        dangerouslySetInnerHTML={{ __html: page.html }}
      />
    </main>
  );
}
