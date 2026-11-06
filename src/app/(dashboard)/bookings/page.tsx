import React from "react";
import { getServerAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import BookingsClient from "./BookingsClient";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const authContext = await getServerAuthContext();
  if (!authContext) {
    redirect("/login?reason=unauthorized");
  }

  const cleanUser = JSON.parse(JSON.stringify(authContext.user));
  const cleanRole = JSON.parse(JSON.stringify(authContext.role));

  return <BookingsClient user={cleanUser} role={cleanRole} />;
}
