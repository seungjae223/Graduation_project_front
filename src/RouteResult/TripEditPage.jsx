import React from "react";
import { Navigate, useSearchParams } from "react-router-dom";

// Keep older bookmarks valid, but edit the itinerary in-place on the detail route.
// This avoids a second screen, a second independent layout, and transition animations.
export default function TripEditPage() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const day = params.get("day");
  const target = new URLSearchParams();
  if (id) target.set("id", id);
  target.set("edit", "1");
  if (day && /^\d+$/.test(day)) target.set("day", day);
  if (params.get("add") === "1") target.set("add", "1");
  return <Navigate to={"/route-result?" + target.toString()} replace />;
}
