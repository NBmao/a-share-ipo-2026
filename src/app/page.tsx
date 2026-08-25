import { IpoDashboard } from "@/components/ipo-dashboard";
import { readIpoPayload } from "@/lib/ipo-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await readIpoPayload();
  return <IpoDashboard data={data} />;
}
