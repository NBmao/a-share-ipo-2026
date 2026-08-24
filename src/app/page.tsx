import { IpoDashboard } from "@/components/ipo-dashboard";
import type { IpoPayload } from "@/lib/ipo";
import payload from "../../data/ipo_2026.json";

export default function Home() {
  return <IpoDashboard data={payload as IpoPayload} />;
}
