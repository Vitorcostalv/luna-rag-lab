import { buildGraph } from "@/core/knowledge/graph";
import { snapshot } from "@/demo/public";
export async function GET() {
  return Response.json({
    ...buildGraph(snapshot.documents, snapshot.chunks),
    mode: "versioned public corpus",
  });
}
