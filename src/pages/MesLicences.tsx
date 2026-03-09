import { useState } from "react";
import { useLocation } from "wouter";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Key, 
  Smartphone, 
  Copy, 
  Check, 
  AlertCircle, 
  Clock, 
  Shield, 
  RefreshCw,
  ArrowLeft,
  Plus,
  Laptop,
  History,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Turnstile from "@/components/Turnstile";

export default function MesLicences() {
  const [, setLocation] = useLocation();
  const { t, language } = useLanguage();
  const { fingerprint, deviceName } = useDeviceFingerprint();
  
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [activationCode, setActivationCode] = useState("");
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [licenseToDeactivate, setLicenseToDeactivate] = useState<string | null>(null);
  const [expandedLicense, setExpandedLicense] = useState<number | null>(null);
  const [activationTurnstileToken, setActivationTurnstileToken] = useState<string | null>(null);
  
  // Récupérer les licences de l'utilisateur
  const { data: licenses, isLoading, refetch } = trpc.license.getMyLicenses.useQuery();
  
  // Récupérer l'historique d'une licence
  const { data: licenseHistory } = trpc.license.getLicenseHistory.useQuery(
    { licenseId: expandedLicense ?? 0 },
    { enabled: expandedLicense !== null }
  );
  
  // Mutations
  const activateMutation = trpc.license.activate.useMutation({
    onSuccess: () => {
      toast.success(t('licenses.successActivated'));
      setShowActivateDialog(false);
      setActivationCode("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || t('licenses.errorActivation'));
    },
  });
  
  const deactivateMutation = trpc.license.deactivate.useMutation({
    onSuccess: () => {
      toast.success(t('licenses.successDeactivated'));
      setShowDeactivateDialog(false);
      setLicenseToDeactivate(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || t('licenses.errorDeactivation'));
    },
  });
  
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(t('licenses.codeCopied'));
    setTimeout(() => setCopiedCode(null), 2000);
  };
  
  const handleActivate = async () => {
    if (!activationCode.trim()) {
      toast.error(t('licenses.enterCode'));
      return;
    }
    
    // Vérifier le token Turnstile
    if (!activationTurnstileToken) {
      toast.error(language === "fr" 
        ? language === "fr" ? "Veuillez compléter la vérification de sécurité." : "Please complete the security verification." 
        : "Please complete the security verification.");
      return;
    }
    
    // Vérifier le token côté serveur
    try {
      const verifyResponse = await fetch("/api/turnstile/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: activationTurnstileToken }),
      });
      const verifyData = await verifyResponse.json();
      
      if (!verifyData.success) {
        toast.error(language === "fr" 
          ? language === "fr" ? "Vérification de sécurité échouée. Veuillez réessayer." : "Security verification failed. Please try again." 
          : "Security verification failed. Please try again.");
        setActivationTurnstileToken(null);
        return;
      }
    } catch (error) {
      console.error("Erreur de vérification Turnstile:", error);
      // En cas d'erreur, on continue (fail-open)
    }
    
    activateMutation.mutate({
      licenseCode: activationCode.trim().toUpperCase(),
    });
  };
  
  const handleDeactivate = () => {
    if (!licenseToDeactivate || !fingerprint) return;
    
    // Trouver l'ID de la licence à désactiver
    const licenseToDeact = licenses?.find(l => l.licenseCode === licenseToDeactivate);
    if (licenseToDeact) {
      deactivateMutation.mutate({
        licenseId: licenseToDeact.id,
      });
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500 hover:bg-green-600"><Check className="w-3 h-3 mr-1" /> {t('licenses.statusActive')}</Badge>;
      case "pending":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="w-3 h-3 mr-1" /> {t('licenses.statusPending')}</Badge>;
      case "expired":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> {t('licenses.statusExpired')}</Badge>;
      case "revoked":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> {t('licenses.statusRevoked')}</Badge>;
      case "transferred":
        return <Badge variant="secondary"><RefreshCw className="w-3 h-3 mr-1" /> {t('licenses.statusTransferred')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    const locale = language === 'fr' ? 'fr-FR' : 'en-US';
    return new Date(date).toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  
  const isCurrentDevice = (licenseFingerprint: string | null) => {
    return licenseFingerprint === fingerprint;
  };
  
  const getEventLabel = (eventType: string) => {
    switch (eventType) {
      case "created": return `🎉 ${t('licenses.eventCreated')}`;
      case "activated": return `✅ ${t('licenses.eventActivated')}`;
      case "deactivated": return `🔄 ${t('licenses.eventDeactivated')}`;
      case "transferred": return `📱 ${t('licenses.eventTransferred')}`;
      case "revoked": return `❌ ${t('licenses.eventRevoked')}`;
      case "reactivated": return `🔓 ${t('licenses.eventReactivated')}`;
      default: return eventType;
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-4xl py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/parametres")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Key className="w-8 h-8 text-blue-600" />
              {t('licenses.title')}
            </h1>
            <p className="text-gray-500 mt-1">
              {t('licenses.subtitle')}
            </p>
          </div>
        </div>
        
        {/* Appareil actuel */}
        <Card className="mb-6 border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Laptop className="w-5 h-5 text-blue-600" />
              {t('licenses.currentDevice')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{deviceName}</p>
                <p className="text-sm text-gray-500 font-mono">{fingerprint?.slice(0, 16)}...</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowActivateDialog(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                {t('licenses.activateLicense')}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Liste des licences */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t('licenses.yourLicenses')} ({licenses?.length || 0})
          </h2>
          
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                <p className="mt-2 text-gray-500">{t('licenses.loading')}</p>
              </CardContent>
            </Card>
          ) : licenses && licenses.length > 0 ? (
            licenses.map((license: any) => (
              <Card key={license.id} className={`transition-all ${isCurrentDevice(license.deviceFingerprint) ? "border-green-300 bg-green-50/30" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg font-mono tracking-wider">
                          {license.licenseCode}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(license.licenseCode)}
                          className="h-8 w-8 p-0"
                        >
                          {copiedCode === license.licenseCode ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <CardDescription className="flex items-center gap-4">
                        <span>{t('licenses.type')} : {license.licenseType === "lifetime" ? t('licenses.lifetime') : license.licenseType}</span>
                        <span>•</span>
                        <span>{t('licenses.createdOn')} {formatDate(license.createdAt)}</span>
                      </CardDescription>
                    </div>
                    {getStatusBadge(license.status)}
                  </div>
                </CardHeader>
                
                <CardContent>
                  {/* Informations sur l'appareil */}
                  {license.deviceFingerprint && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mb-4">
                      <Smartphone className="w-5 h-5 text-gray-500" />
                      <div className="flex-1">
                        <p className="font-medium">
                          {license.deviceName || t('licenses.unknownDevice')}
                          {isCurrentDevice(license.deviceFingerprint) && (
                            <Badge variant="outline" className="ml-2 text-xs">{t('licenses.thisDevice')}</Badge>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {t('licenses.activatedOn')} {formatDate(license.activatedAt)}
                        </p>
                      </div>
                      
                      {/* Bouton désactiver (seulement si c'est l'appareil actuel et la licence est active) */}
                      {isCurrentDevice(license.deviceFingerprint) && license.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setLicenseToDeactivate(license.licenseCode);
                            setShowDeactivateDialog(true);
                          }}
                          className="text-orange-600 border-orange-300 hover:bg-orange-50"
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          {t('licenses.transfer')}
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {/* Compteur de transferts */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <span>{t('licenses.transfersUsed')} : {license.transferCount || 0} / 3</span>
                    {license.expiresAt && (
                      <span>{t('licenses.expiresOn')} : {formatDate(license.expiresAt)}</span>
                    )}
                  </div>
                  
                  {/* Historique (collapsible) */}
                  <Collapsible
                    open={expandedLicense === license.id}
                    onOpenChange={(open) => setExpandedLicense(open ? license.id : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <History className="w-4 h-4" />
                          {t('licenses.history')}
                        </span>
                        {expandedLicense === license.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                        {licenseHistory && licenseHistory.length > 0 ? (
                          licenseHistory.map((event: any) => (
                            <div key={event.id} className="flex items-center justify-between text-sm">
                              <span>{getEventLabel(event.eventType)}</span>
                              <span className="text-gray-400">{formatDate(event.createdAt)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-400 text-center py-2">{t('licenses.noHistory')}</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Key className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('licenses.noLicense')}
                </h3>
                <p className="text-gray-500 mb-6">
                  {t('licenses.noLicenseDesc')}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => setShowActivateDialog(true)} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('licenses.activateCode')}
                  </Button>
                  <Button onClick={() => setLocation("/paiement")}>
                    {t('licenses.buyLicense')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Dialog d'activation */}
        <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                {t('licenses.activateTitle')}
              </DialogTitle>
              <DialogDescription>
                {t('licenses.activateDesc')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="license-code">{t('licenses.licenseCode')}</Label>
                <Input
                  id="license-code"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                  className="font-mono text-center text-lg tracking-widest"
                />
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <p className="font-medium mb-1">{t('licenses.targetDevice')} :</p>
                <p>{deviceName}</p>
              </div>
              
              {/* Vérification de sécurité Turnstile */}
              <div className="flex justify-center">
                <Turnstile
                  onVerify={(token) => setActivationTurnstileToken(token)}
                  onExpire={() => setActivationTurnstileToken(null)}
                  theme="light"
                  size="compact"
                  language={language}
                />
              </div>
              
              {activationTurnstileToken && (
                <div className="flex items-center justify-center gap-2 text-green-600 text-sm">
                  <Check className="w-4 h-4" />
                  {language === "fr" ? "Vérification réussie" : "Verification successful"}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowActivateDialog(false);
                setActivationTurnstileToken(null);
              }}>
                {t('licenses.cancel')}
              </Button>
              <Button 
                onClick={handleActivate}
                disabled={activateMutation.isPending || !activationTurnstileToken}
              >
                {activateMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                {t('licenses.activate')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Dialog de désactivation/transfert */}
        <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <RefreshCw className="w-5 h-5" />
                {t('licenses.transferTitle')}
              </DialogTitle>
              <DialogDescription>
                {t('licenses.transferDesc')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  <strong>Attention :</strong> {t('licenses.transferWarning')}
                </p>
                <p className="text-sm text-orange-600 mt-2">
                  {t('licenses.transferLimit')}
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
                {t('licenses.cancel')}
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDeactivate}
                disabled={deactivateMutation.isPending}
              >
                {deactivateMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {t('licenses.deactivateAndTransfer')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
