// Non disponible en mode Electron — application locale sans gestion de licence.
import { useLocation } from "wouter";
import { useEffect } from "react";
export default function MesLicences() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/albums"); }, [navigate]);
  return null;
}
