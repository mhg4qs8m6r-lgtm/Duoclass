import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone, Monitor, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPWA() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Vérifier si l'app est déjà installée
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Détecter iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Écouter l'événement beforeinstallprompt (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Écouter l'événement appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowInstallDialog(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      setShowInstallDialog(true);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error("Erreur lors de l'installation:", error);
    }
  };

  // Ne pas afficher si déjà installé
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* Bouton d'installation */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleInstallClick}
        className="gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 hover:from-blue-600 hover:to-purple-600 hover:text-white"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">
          {t("pwa.install") || "Installer l'app"}
        </span>
      </Button>

      {/* Dialog pour navigateurs non supportés */}
      <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-500" />
              {t("pwa.installTitle") || "Installer DuoClass"}
            </DialogTitle>
            <DialogDescription>
              {t("pwa.installDescription") || "Installez DuoClass sur votre appareil pour un accès rapide et une utilisation hors-ligne."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Monitor className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">
                  {t("pwa.desktopInstructions") || "Sur ordinateur (Chrome, Edge)"}
                </p>
                <p className="text-sm text-gray-600">
                  {t("pwa.desktopSteps") || "Cliquez sur l'icône d'installation dans la barre d'adresse (⊕) ou utilisez le menu ⋮ → \"Installer DuoClass\""}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <Smartphone className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">
                  {t("pwa.mobileInstructions") || "Sur mobile (Android)"}
                </p>
                <p className="text-sm text-gray-600">
                  {t("pwa.mobileSteps") || "Ouvrez le menu ⋮ et sélectionnez \"Ajouter à l'écran d'accueil\""}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowInstallDialog(false)}>
              {t("common.close") || "Fermer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog instructions iOS */}
      <Dialog open={showIOSInstructions} onOpenChange={setShowIOSInstructions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-500" />
              {t("pwa.iosTitle") || "Installer sur iPhone/iPad"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  1
                </div>
                <p className="text-sm">
                  {t("pwa.iosStep1") || "Appuyez sur le bouton Partager"}
                  <span className="ml-2 inline-block px-2 py-0.5 bg-gray-100 rounded text-xs">
                    ⬆️
                  </span>
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  2
                </div>
                <p className="text-sm">
                  {t("pwa.iosStep2") || "Faites défiler et appuyez sur \"Sur l'écran d'accueil\""}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  3
                </div>
                <p className="text-sm">
                  {t("pwa.iosStep3") || "Appuyez sur \"Ajouter\" en haut à droite"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-700">
              <Check className="w-5 h-5" />
              <p className="text-sm">
                {t("pwa.iosSuccess") || "DuoClass apparaîtra sur votre écran d'accueil !"}
              </p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowIOSInstructions(false)}>
              {t("common.understood") || "Compris"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
