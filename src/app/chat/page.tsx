import { Workbench } from "@/components/chat/workbench";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 4000) : "";
  return <Workbench initialQuery={q} />;
}
