"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function PortalPage() {
  const { usuario } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!usuario) return;
    const role = usuario.role;
    if (role === "ADMINISTRADOR") router.replace("/portal/agenda");
    else if (role === "OPERADOR") router.replace("/portal/financeiro");
    else router.replace("/portal/estatisticas");
  }, [usuario, router]);
  return null;
}
