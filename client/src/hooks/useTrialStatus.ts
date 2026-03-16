import { useState, useEffect } from "react";

// Simulation du hook useTrialStatus pour la maquette frontend
// Dans la version réelle, cela ferait appel à l'API backend (trpc)
export function useTrialStatus() {
  // État simulé pour la maquette
  const [status, setStatus] = useState({
    isLoading: true,
    isPremium: false,
    isTrialActive: true,
    daysRemaining: 12, // Valeur par défaut pour la démo
    isExpired: false,
    trialEndDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // J+12
  });

  useEffect(() => {
    // Simuler un chargement
    const timer = setTimeout(() => {
      setStatus(prev => ({ ...prev, isLoading: false }));
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return status;
}
