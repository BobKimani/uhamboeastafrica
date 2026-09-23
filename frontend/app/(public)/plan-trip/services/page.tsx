import { redirect } from "next/navigation";

// The old combined "Services" step was split into Accommodation and Transport.
export default function ServicesStep() {
  redirect("/plan-trip/accommodation");
}
