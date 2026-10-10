import recorded from "@/demo/safety.json";
export async function GET() {
  return Response.json(recorded);
}
