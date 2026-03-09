import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import {
// Note: language read from localStorage to avoid circular dependency
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AuthContextType {
  isAuthenticated: boolean;
  isGuestMode: boolean;
  login: () => void;
  logout: () => void;
  toggleGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Durée d'affichage de la modale avant déconnexion forcée (en ms) - ex: 60 secondes
const WARNING_DURATION = 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [location, setLocation] = useLocation();
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_DURATION / 1000);
  
  // États pour les paramètres dynamiques
  const [inactivityTimeoutMs, setInactivityTimeoutMs] = useState(10 * 60 * 1000);
  const [exemptTimeStart, setExemptTimeStart] = useState("09:00");
  const [exemptTimeEnd, setExemptTimeEnd] = useState("18:00");
  const [enableExemptTime, setEnableExemptTime] = useState(false);
  
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Charger les paramètres depuis localStorage
  const loadSettings = useCallback(() => {
    const storedTimeout = localStorage.getItem("inactivityTimeout");
    if (storedTimeout) setInactivityTimeoutMs(parseInt(storedTimeout) * 60 * 1000);
    
    const storedStart = localStorage.getItem("exemptTimeStart");
    if (storedStart) setExemptTimeStart(storedStart);
    
    const storedEnd = localStorage.getItem("exemptTimeEnd");
    if (storedEnd) setExemptTimeEnd(storedEnd);
    
    const storedEnable = localStorage.getItem("enableExemptTime");
    if (storedEnable) setEnableExemptTime(storedEnable === "true");
  }, []);

  // Écouter les changements de paramètres
  useEffect(() => {
    loadSettings();
    window.addEventListener('storage', loadSettings);
    return () => window.removeEventListener('storage', loadSettings);
  }, [loadSettings]);

  // Vérifier le stockage de session au chargement
  useEffect(() => {
    const storedAuth = sessionStorage.getItem('admin_session');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const login = () => {
    sessionStorage.setItem('admin_session', 'true');
    setIsAuthenticated(true);
    setIsGuestMode(false); // Disable guest mode when admin logs in
    resetInactivityTimer();
  };

  const toggleGuestMode = () => {
    setIsGuestMode(prev => !prev);
  };

  const logout = useCallback(() => {
    sessionStorage.removeItem('admin_session');
    setIsAuthenticated(false);
    setShowInactivityModal(false);
    clearTimers();
    toast.success((localStorage.getItem("duoclass_language") || "fr") === "fr" ? "Session administrateur fermée" : "Admin session closed");
    
    // Rediriger vers l'accueil si on est sur une page admin ou un album sécurisé
    // On redirige toujours vers l'accueil pour plus de sécurité lors d'une déconnexion explicite
    setLocation('/');
  }, [setLocation]);

  const clearTimers = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  const startWarningTimer = () => {
    setShowInactivityModal(true);
    setCountdown(WARNING_DURATION / 1000);
    
    // Compte à rebours visuel
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Timer de déconnexion forcée
    warningTimerRef.current = setTimeout(() => {
      logout();
      toast.info((localStorage.getItem("duoclass_language") || "fr") === "fr" ? "Session expirée pour cause d'inactivité" : "Session expired due to inactivity");
    }, WARNING_DURATION);
  };

  const isWithinExemptTime = useCallback(() => {
    if (!enableExemptTime) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = exemptTimeStart.split(':').map(Number);
    const startTime = startH * 60 + startM;
    
    const [endH, endM] = exemptTimeEnd.split(':').map(Number);
    const endTime = endH * 60 + endM;
    
    return currentTime >= startTime && currentTime <= endTime;
  }, [enableExemptTime, exemptTimeStart, exemptTimeEnd]);

  const resetInactivityTimer = useCallback(() => {
    if (!isAuthenticated) return;
    
    clearTimers();
    setShowInactivityModal(false); // Cacher la modale si elle était affichée (l'utilisateur est revenu)
    
    // Si on est dans la plage horaire exemptée, on ne lance pas le timer
    if (isWithinExemptTime()) return;
    
    inactivityTimerRef.current = setTimeout(() => {
      // Vérifier à nouveau si on est dans la plage exemptée avant de déclencher l'alerte
      if (!isWithinExemptTime()) {
        startWarningTimer();
      } else {
        // Si on est entré dans la plage exemptée entre temps, on relance juste le timer silencieusement
        resetInactivityTimer();
      }
    }, inactivityTimeoutMs);
  }, [isAuthenticated, inactivityTimeoutMs, isWithinExemptTime]);

  // Écouter les événements d'activité
  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      return;
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => {
      // Si la modale est déjà affichée, on ne reset pas automatiquement au mouvement de souris
      // L'utilisateur doit cliquer sur "Rester connecté" dans la modale
      if (!showInactivityModal) {
        resetInactivityTimer();
      }
    };

    events.forEach(event => window.addEventListener(event, handleActivity));
    
    // Démarrer le timer initial
    resetInactivityTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      clearTimers();
    };
  }, [isAuthenticated, resetInactivityTimer, showInactivityModal, inactivityTimeoutMs, enableExemptTime, exemptTimeStart, exemptTimeEnd]);

  const handleStayConnected = () => {
    resetInactivityTimer();
    setShowInactivityModal(false);
  };

  const handleLogoutConfirm = () => {
    logout();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isGuestMode, login, logout, toggleGuestMode }}>
      {children}
      
      <AlertDialog open={showInactivityModal} onOpenChange={setShowInactivityModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{(localStorage.getItem('duoclass-language') || 'fr') === 'fr' ? "Délai d'inactivité dépassé" : 'Inactivity timeout exceeded'}</AlertDialogTitle>
            <AlertDialogDescription>
              {(localStorage.getItem('duoclass-language') || 'fr') === 'fr'
                ? `Votre session administrateur va expirer dans ${countdown} secondes. Voulez-vous rester connecté ou quitter la session ?`
                : `Your admin session will expire in ${countdown} seconds. Do you want to stay connected or log out?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleLogoutConfirm}>{(localStorage.getItem('duoclass-language') || 'fr') === 'fr' ? 'Sortir' : 'Log out'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleStayConnected}>{(localStorage.getItem('duoclass-language') || 'fr') === 'fr' ? 'Rester sur la page' : 'Stay on page'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
