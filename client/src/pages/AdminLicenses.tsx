// Non disponible en mode Electron.
import { useLocation } from "wouter";
import { useEffect } from "react";
export default function AdminLicenses() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/albums"); }, [navigate]);
  return null;
}
