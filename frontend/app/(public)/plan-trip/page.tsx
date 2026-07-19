"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard/store";

export default function PlanTripIndex() {
  const { reset } = useWizard();
  const router = useRouter();

  useEffect(() => {
    reset();
    router.replace("/plan-trip/destination");
  }, [reset, router]);

  return null;
}
