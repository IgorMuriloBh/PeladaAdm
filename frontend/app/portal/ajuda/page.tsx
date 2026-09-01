"use client";
import { useAuth } from "@/lib/auth";
import { Manual } from "@/components/Manual";

export default function PortalAjudaPage() {
  const { usuario } = useAuth();
  return <Manual contexto="portal" papel={usuario?.role} />;
}
