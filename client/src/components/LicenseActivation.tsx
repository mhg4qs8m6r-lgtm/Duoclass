import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Key, CheckCircle, XCircle, RefreshCw, AlertTriangle, Copy, Check } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface LicenseActivationProps {
  onActivated?: () => void;
  showStatus?: boolean;
}

export function LicenseActivation({ onActivated, showStatus = true }: LicenseActivationProps) {
  const { t, language } = useLanguage();
  
  const [inputCode, setInputCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  // Vérification de la licence
  const { data: licenseStatus, refetch: refetchLicense } = trpc.license.check.useQuery();

  // Mutation pour activer
  const activateMutation = trpc.license.activate.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(language === 'fr' ? 'Licence activée avec succès !' : 'License activated successfully!');
        refetchLicense();
        onActivated?.();
      } else {
        toast.error(language === 'fr' ? 'Erreur lors de l\'activation' : 'Activation error');
      }
      setIsActivating(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsActivating(false);
    },
  });

  // Mutation pour désactiver
  const deactivateMutation = trpc.license.deactivate.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(language === 'fr' 
          ? 'Licence désactivée. Vous pouvez maintenant l\'activer sur un autre appareil.' 
          : 'License deactivated. You can now activate it on another device.');
        refetchLicense();
        setShowDeactivateDialog(false);
      } else {
        toast.error(language === 'fr' ? 'Erreur lors de la désactivation' : 'Deactivation error');
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleActivate = () => {
    const cleanCode = inputCode.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (cleanCode.length < 16) {
      toast.error(language === 'fr' 
        ? 'Code de licence invalide (16 caractères minimum)' 
        : 'Invalid license code (16 characters minimum)');
      return;
    }

    setIsActivating(true);
    activateMutation.mutate({
      licenseCode: cleanCode,
    });
  };

  const handleDeactivate = () => {
    if (!licenseStatus?.license?.id) return;
    
    deactivateMutation.mutate({
      licenseId: licenseStatus.license.id,
    });
  };

  const formatLicenseCode = (code: string) => {
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const parts = [];
    for (let i = 0; i < clean.length; i += 4) {
      parts.push(clean.slice(i, i + 4));
    }
    return parts.join('-');
  };

  const copyLicenseCode = () => {
    if (licenseStatus?.license?.licenseCode) {
      navigator.clipboard.writeText(licenseStatus.license.licenseCode);
      setCopied(true);
      toast.success(language === 'fr' ? 'Code copié !' : 'Code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Si l'utilisateur a déjà une licence active
  if (licenseStatus?.hasLicense && showStatus) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <CardTitle className="text-green-800">
              {language === 'fr' ? 'Licence Active' : 'Active License'}
            </CardTitle>
          </div>
          <CardDescription>
            {language === 'fr' 
              ? 'Votre licence est valide et active sur cet appareil.' 
              : 'Your license is valid and active on this device.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-gray-500" />
              <code className="text-sm font-mono">
                {licenseStatus.license?.licenseCode || '****-****-****-****'}
              </code>
            </div>
            <Button variant="ghost" size="sm" onClick={copyLicenseCode}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              {licenseStatus.license?.licenseType === 'lifetime' 
                ? (language === 'fr' ? 'Licence à vie' : 'Lifetime license')
                : licenseStatus.license?.licenseType}
            </Badge>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setShowDeactivateDialog(true)}
          >
            <XCircle className="w-4 h-4 mr-2" />
            {language === 'fr' ? 'Désactiver sur cet appareil' : 'Deactivate on this device'}
          </Button>
        </CardFooter>

        {/* Dialog de confirmation de désactivation */}
        <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {language === 'fr' ? 'Désactiver la licence ?' : 'Deactivate license?'}
              </DialogTitle>
              <DialogDescription>
                {language === 'fr' 
                  ? 'Vous pourrez réactiver votre licence sur cet appareil ou un autre appareil plus tard.'
                  : 'You can reactivate your license on this device or another device later.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeactivate}
                disabled={deactivateMutation.isPending}
              >
                {deactivateMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                {language === 'fr' ? 'Désactiver' : 'Deactivate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  // Formulaire d'activation
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-blue-600" />
          <CardTitle>
            {language === 'fr' ? 'Activer votre licence' : 'Activate your license'}
          </CardTitle>
        </div>
        <CardDescription>
          {language === 'fr' 
            ? 'Entrez votre code de licence pour activer DuoClass sur cet appareil.'
            : 'Enter your license code to activate DuoClass on this device.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="license-code">
            {language === 'fr' ? 'Code de licence' : 'License code'}
          </Label>
          <Input
            id="license-code"
            placeholder="XXXX-XXXX-XXXX-XXXX"
            value={inputCode}
            onChange={(e) => setInputCode(formatLicenseCode(e.target.value))}
            className="font-mono text-center text-lg tracking-wider"
            maxLength={19}
          />
        </div>

        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>{language === 'fr' ? 'Important' : 'Important'}</AlertTitle>
          <AlertDescription>
            {language === 'fr' 
              ? 'Votre licence peut être activée sur un seul appareil à la fois. Vous pouvez la transférer vers un autre appareil à tout moment.'
              : 'Your license can be activated on one device at a time. You can transfer it to another device at any time.'}
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleActivate}
          disabled={isActivating || inputCode.replace(/-/g, '').length < 16}
        >
          {isActivating && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
          {language === 'fr' ? 'Activer la licence' : 'Activate license'}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default LicenseActivation;
