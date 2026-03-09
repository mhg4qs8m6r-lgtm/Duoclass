import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { AlertTriangle, Clock, XCircle } from "lucide-react";

interface TrialAlertProps {
  daysRemaining: number;
  isExpired: boolean;
}

export function TrialAlert({ daysRemaining, isExpired }: TrialAlertProps) {
  const [, setLocation] = useLocation();

  if (isExpired) {
    return (
      <Alert className="border-red-500 bg-red-50">
        <XCircle className="h-5 w-5 text-red-600" />
        <AlertTitle className="text-red-800 font-bold">
          Votre période d'essai est terminée
        </AlertTitle>
        <AlertDescription className="text-red-700">
          Pour continuer à utiliser DuoClass, passez à la version officielle.
          <div className="mt-3">
            <Button 
              onClick={() => setLocation("/parametres")}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Acheter la version officielle
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Alerte J-1 (rouge)
  if (daysRemaining === 1) {
    return (
      <Alert className="border-red-500 bg-red-50">
        <AlertTriangle className="h-5 w-5 text-red-600" />
        <AlertTitle className="text-red-800 font-bold">
          🚨 Dernier jour d'essai !
        </AlertTitle>
        <AlertDescription className="text-red-700">
          Votre période d'essai se termine demain. Passez à la version officielle pour continuer à utiliser DuoClass.
          <div className="mt-2">
            <Button 
              onClick={() => setLocation("/parametres")}
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              Voir les options
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Alerte J-2 (orange)
  if (daysRemaining === 2) {
    return (
      <Alert className="border-orange-500 bg-orange-50">
        <Clock className="h-5 w-5 text-orange-600" />
        <AlertTitle className="text-orange-800 font-bold">
          ⚠️ Il vous reste 2 jours d'essai
        </AlertTitle>
        <AlertDescription className="text-orange-700">
          Profitez de votre essai et pensez à passer à la version officielle pour ne pas perdre l'accès à vos données.
        </AlertDescription>
      </Alert>
    );
  }

  // Alerte J-3 (jaune)
  if (daysRemaining === 3) {
    return (
      <Alert className="border-yellow-500 bg-yellow-50">
        <Clock className="h-5 w-5 text-yellow-600" />
        <AlertTitle className="text-yellow-800 font-bold">
          ⚠️ Il vous reste 3 jours d'essai
        </AlertTitle>
        <AlertDescription className="text-yellow-700">
          Votre période d'essai touche à sa fin. Découvrez nos offres pour continuer à profiter de DuoClass.
        </AlertDescription>
      </Alert>
    );
  }

  // Pas d'alerte si plus de 3 jours restants
  return null;
}
