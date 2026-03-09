import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Key,
  Search,
  RefreshCw,
  Ban,
  CheckCircle,
  Clock,
  AlertTriangle,
  Copy,
  Monitor,
  Mail,
  Calendar,
  History,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AdminLicenses() {
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLicense, setSelectedLicense] = useState<any>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  // Récupérer toutes les licences (admin only)
  const { data: licenses, isLoading, refetch } = trpc.license.getAllLicenses.useQuery();
  
  // Récupérer l'historique d'une licence
  const { data: licenseHistory } = trpc.license.getLicenseHistory.useQuery(
    { licenseId: selectedLicense?.id },
    { enabled: !!selectedLicense?.id && showHistoryDialog }
  );

  // Mutation pour révoquer une licence
  const revokeMutation = trpc.license.revokeLicense.useMutation({
    onSuccess: () => {
      toast.success(language === "fr" ? "Licence révoquée" : "License revoked");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Mutation pour réactiver une licence
  const reactivateMutation = trpc.license.reactivateLicense.useMutation({
    onSuccess: () => {
      toast.success(language === "fr" ? "Licence réactivée" : "License reactivated");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(language === "fr" ? "Copié !" : "Copied!");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Actif</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case "expired":
        return <Badge className="bg-gray-100 text-gray-800"><AlertTriangle className="w-3 h-3 mr-1" />{language === "fr" ? "Expiré" : "Expired"}</Badge>;
      case "revoked":
        return <Badge className="bg-red-100 text-red-800"><Ban className="w-3 h-3 mr-1" />{language === "fr" ? "Révoqué" : "Revoked"}</Badge>;
      case "transferred":
        return <Badge className="bg-blue-100 text-blue-800"><RefreshCw className="w-3 h-3 mr-1" />{language === "fr" ? "Transféré" : "Transferred"}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filtrer les licences
  const filteredLicenses = licenses?.filter((license: any) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      license.licenseCode.toLowerCase().includes(search) ||
      license.email?.toLowerCase().includes(search) ||
      license.deviceName?.toLowerCase().includes(search)
    );
  });

  const texts = {
    fr: {
      title: "Gestion des Licences",
      subtitle: "Historique et administration des licences DuoClass",
      search: "Rechercher par code, email ou appareil...",
      refresh: "Actualiser",
      loading: "Chargement...",
      noLicenses: "Aucune licence trouvée",
      columns: {
        code: "Code Licence",
        email: "Email",
        status: "Statut",
        type: "Type",
        device: "Appareil",
        created: "Créé le",
        activated: "Activé le",
        transfers: "Transferts",
        actions: "Actions",
      },
      revoke: "Révoquer",
      reactivate: "Réactiver",
      history: "Historique",
      historyTitle: "Historique de la licence",
      historyEmpty: "Aucun événement",
      eventTypes: {
        created: "Création",
        activated: "Activation",
        deactivated: "Désactivation",
        transferred: "Transfert",
        expired: "Expiration",
        revoked: "Révocation",
      },
    },
    en: {
      title: "License Management",
      subtitle: "History and administration of DuoClass licenses",
      search: "Search by code, email or device...",
      refresh: "Refresh",
      loading: "Loading...",
      noLicenses: "No licenses found",
      columns: {
        code: "License Code",
        email: "Email",
        status: "Status",
        type: "Type",
        device: "Device",
        created: "Created",
        activated: "Activated",
        transfers: "Transfers",
        actions: "Actions",
      },
      revoke: "Revoke",
      reactivate: "Reactivate",
      history: "History",
      historyTitle: "License History",
      historyEmpty: "No events",
      eventTypes: {
        created: "Created",
        activated: "Activated",
        deactivated: "Deactivated",
        transferred: "Transferred",
        expired: "Expired",
        revoked: "Revoked",
      },
    },
  };

  const txt = texts[language as keyof typeof texts] || texts.fr;

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Key className="w-6 h-6 text-blue-600" />
              {txt.title}
            </h1>
            <p className="text-gray-600 mt-1">{txt.subtitle}</p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {txt.refresh}
          </Button>
        </div>

        {/* Barre de recherche */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={txt.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{licenses?.length || 0}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-2xl font-bold text-green-700">
              {licenses?.filter((l: any) => l.status === "active").length || 0}
            </div>
            <div className="text-sm text-green-600">Actives</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-700">
              {licenses?.filter((l: any) => l.status === "pending").length || 0}
            </div>
            <div className="text-sm text-yellow-600">En attente</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="text-2xl font-bold text-red-700">
              {licenses?.filter((l: any) => l.status === "revoked").length || 0}
            </div>
            <div className="text-sm text-red-600">{language === "fr" ? "Révoquées" : "Revoked"}</div>
          </div>
        </div>

        {/* Tableau des licences */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">{txt.loading}</div>
          ) : filteredLicenses?.length === 0 ? (
            <div className="p-8 text-center text-gray-500">{txt.noLicenses}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{txt.columns.code}</TableHead>
                  <TableHead>{txt.columns.email}</TableHead>
                  <TableHead>{txt.columns.status}</TableHead>
                  <TableHead>{txt.columns.type}</TableHead>
                  <TableHead>{txt.columns.device}</TableHead>
                  <TableHead>{txt.columns.created}</TableHead>
                  <TableHead>{txt.columns.transfers}</TableHead>
                  <TableHead>{txt.columns.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLicenses?.map((license: any) => (
                  <TableRow key={license.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {license.licenseCode}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(license.licenseCode)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="text-sm">{license.email || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(license.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{license.licenseType}</Badge>
                    </TableCell>
                    <TableCell>
                      {license.deviceName ? (
                        <div className="flex items-center gap-1">
                          <Monitor className="w-3 h-3 text-gray-400" />
                          <span className="text-sm truncate max-w-[150px]">
                            {license.deviceName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="text-sm">{formatDate(license.createdAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {license.transferCount}/{license.maxTransfers}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLicense(license);
                            setShowHistoryDialog(true);
                          }}
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        {license.status === "active" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => revokeMutation.mutate({ licenseId: license.id })}
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        ) : license.status === "revoked" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => reactivateMutation.mutate({ licenseId: license.id })}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Dialog historique */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                {txt.historyTitle}
              </DialogTitle>
              <DialogDescription>
                {selectedLicense?.licenseCode}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[400px] overflow-y-auto">
              {licenseHistory?.length === 0 ? (
                <p className="text-center text-gray-500 py-4">{txt.historyEmpty}</p>
              ) : (
                <div className="space-y-3">
                  {licenseHistory?.map((event: any) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        {event.eventType === "created" && <Key className="w-4 h-4 text-blue-600" />}
                        {event.eventType === "activated" && <CheckCircle className="w-4 h-4 text-green-600" />}
                        {event.eventType === "revoked" && <Ban className="w-4 h-4 text-red-600" />}
                        {event.eventType === "transferred" && <RefreshCw className="w-4 h-4 text-purple-600" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          {txt.eventTypes[event.eventType as keyof typeof txt.eventTypes] || event.eventType}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(event.createdAt)}
                        </div>
                        {event.deviceName && (
                          <div className="text-sm text-gray-600 mt-1">
                            <Monitor className="w-3 h-3 inline mr-1" />
                            {event.deviceName}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
