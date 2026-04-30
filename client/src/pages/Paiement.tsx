// Non disponible en mode Electron — application locale sans abonnement.
import { useLocation } from "wouter";
import { useEffect } from "react";
export default function Paiement() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/albums"); }, [navigate]);
  return null;
}
