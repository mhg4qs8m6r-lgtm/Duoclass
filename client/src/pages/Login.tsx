import { useEffect } from "react";
import { useLocation } from "wouter";

// En mode Electron, l'utilisateur local est toujours authentifié.
// Cette page ne devrait jamais s'afficher — redirection immédiate.
export default function Login() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/albums"); }, [navigate]);
  return null;
}
