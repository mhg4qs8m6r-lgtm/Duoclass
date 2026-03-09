import React, { useState, useEffect, useRef } from 'react';
// AlbumCreationQuestionnaire retiré (onglet Albums supprimé)
import { useLocation } from "wouter";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { db } from "../db";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@/contexts/AuthContext";
import { exportAllData, importAllData, validateBackupFile, ImportResult } from "@/lib/exportUtils";
import { cleanupUnnecessaryCategories } from "@/lib/cleanupCategories";
import { v4 as uuidv4 } from 'uuid';
import { Check, X, Lock, Unlock, Shield, Save, Info, User, Edit2, Trash2, Upload, AlertTriangle, FileJson, Palette, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import QuitConfirmModal from "@/components/QuitConfirmModal";
import ThemeSelector from "@/components/ThemeSelector";
import { useLanguage } from "@/contexts/LanguageContext";

// Types
interface Category {
  id: string;
  label: string;
  color: string;
  isDefault: boolean;
}

export default function Parametres() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const { isAuthenticated, login, isGuestMode, toggleGuestMode } = useAuth();
  
  // --- ÉTATS POUR LE LOCK SCREEN ---
  const [showLockScreen, setShowLockScreen] = useState(() => {
    // Check if there's an active session in sessionStorage
    const hasSession = sessionStorage.getItem('admin_session') === 'true';
    return !hasSession && !isAuthenticated;
  });
  const [password, setPassword] = useState("");
  
  // Protection de la route (Modifiée pour Lock Screen)
  useEffect(() => {
    if (!isAuthenticated) {
      // Check if there's an active session in sessionStorage
      const hasSession = sessionStorage.getItem('admin_session') === 'true';
      setShowLockScreen(!hasSession);
    } else {
      setShowLockScreen(false);
    }
  }, [isAuthenticated]);

  const handleUnlock = () => {
    // Direct comparison with space removal
    const normalizedPassword = password.replace(/\s/g, '').trim();
    const normalizedMasterCode = (masterCode || '000000').replace(/\s/g, '').trim();
    
    if (normalizedPassword === normalizedMasterCode && normalizedPassword !== '') {
      login();
      setShowLockScreen(false);
      toast.success(t('settings.accessGranted'));
    } else {
      toast.error(t('settings.wrongCode'));
    }
  };

  const handleCancelUnlock = () => {
    setLocation("/");
  };

  // --- ÉTATS & DONNÉES ---

  // 1. Général
  const [userInfo, setUserInfo] = useState({
    nom: "", prenom: "", adresse: "", email: "", portable: ""
  });
  // Option "Page au démarrage" supprimée - l'utilisateur arrive toujours sur Albums

  // 2. Albums & Catégories
  const allCategories = useLiveQuery(() => db.categories.toArray()) || [];
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#000000");
  const [newCategoryType, setNewCategoryType] = useState<"standard" | "secure">("standard"); // New state for category creation
  const [selectedCategorySeries, setSelectedCategorySeries] = useState<"photoclass" | "classpapiers">("photoclass"); // Filter categories by series
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  
  // Trigger to refresh albums list when new album is created
  // albumRefreshTrigger et handleAlbumCreated retirés (onglet Albums supprimé)

  // 3. Sécurité
  const masterCodeSetting = useLiveQuery(() => db.settings.get('master_code'));
  const masterCode = String(masterCodeSetting?.value ?? '000000');
  const [newMasterCode, setNewMasterCode] = useState("");
  const [confirmMasterCode, setConfirmMasterCode] = useState("");
  const [parentalFilterLevel, setParentalFilterLevel] = useState(5);
  
  // Paramètres de session
  const [inactivityTimeout, setInactivityTimeout] = useState("10");
  const [autoLogoutExemptStart, setAutoLogoutExemptStart] = useState("09:00");
  const [autoLogoutExemptEnd, setAutoLogoutExemptEnd] = useState("18:00");

  // 4. Sauvegardes
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // Réinitialisation d'usine
  const [showFactoryResetDialog, setShowFactoryResetDialog] = useState(false);
  const [factoryResetConfirmText, setFactoryResetConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFileInfo, setImportFileInfo] = useState<{
    version: number;
    timestamp: string;
    albumsCount: number;
    categoriesCount: number;
    settingsCount: number;
  } | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const importFileInputRef = useRef<HTMLInputElement>(null);
  
  // Sauvegarde automatique
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupFrequency, setAutoBackupFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [lastAutoBackup, setLastAutoBackup] = useState<string | null>(null);
  const [nextAutoBackup, setNextAutoBackup] = useState<string | null>(null);

  // 5. Infos & Licence
  // (Pas d'état spécifique pour l'instant)

  // 6. Modale Quitter
  const [showQuitModal, setShowQuitModal] = useState(false);

  // --- EFFETS DE CHARGEMENT ---
  useEffect(() => {
    const loadSettings = async () => {
      const storedTimeout = localStorage.getItem("inactivity_timeout");
      if (storedTimeout) setInactivityTimeout(storedTimeout);
      
      const storedExemptStart = localStorage.getItem("auto_logout_exempt_start");
      if (storedExemptStart) setAutoLogoutExemptStart(storedExemptStart);
      
      const storedExemptEnd = localStorage.getItem("auto_logout_exempt_end");
      if (storedExemptEnd) setAutoLogoutExemptEnd(storedExemptEnd);
      
      // Charger le niveau de contrôle parental
      const storedParentalLevel = localStorage.getItem("parental_control_level");
      if (storedParentalLevel) setParentalFilterLevel(parseInt(storedParentalLevel));
      
      // Charger les paramètres de sauvegarde automatique
      const storedAutoBackupEnabled = localStorage.getItem("auto_backup_enabled");
      if (storedAutoBackupEnabled) setAutoBackupEnabled(storedAutoBackupEnabled === 'true');
      
      const storedAutoBackupFrequency = localStorage.getItem("auto_backup_frequency");
      if (storedAutoBackupFrequency) setAutoBackupFrequency(storedAutoBackupFrequency as 'daily' | 'weekly' | 'monthly');
      
      const storedLastAutoBackup = localStorage.getItem("last_auto_backup");
      if (storedLastAutoBackup) setLastAutoBackup(storedLastAutoBackup);
      
      // Calculer la prochaine sauvegarde
      if (storedAutoBackupEnabled === 'true' && storedLastAutoBackup) {
        const lastDate = new Date(storedLastAutoBackup);
        const freq = storedAutoBackupFrequency || 'weekly';
        let nextDate = new Date(lastDate);
        if (freq === 'daily') nextDate.setDate(nextDate.getDate() + 1);
        else if (freq === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
        else if (freq === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        setNextAutoBackup(nextDate.toISOString());
      }
    };
    loadSettings();
  }, []);

  // Sauvegarder le niveau de contrôle parental quand il change
  useEffect(() => {
    localStorage.setItem("parental_control_level", parentalFilterLevel.toString());
  }, [parentalFilterLevel]);

  // --- HANDLERS ---

  // Sauvegarde automatique
  const handleAutoBackupToggle = (enabled: boolean) => {
    setAutoBackupEnabled(enabled);
    localStorage.setItem("auto_backup_enabled", enabled.toString());
    
    if (enabled) {
      // Démarrer la première sauvegarde automatique
      const now = new Date().toISOString();
      setLastAutoBackup(now);
      localStorage.setItem("last_auto_backup", now);
      
      // Calculer la prochaine sauvegarde
      const nextDate = new Date();
      if (autoBackupFrequency === 'daily') nextDate.setDate(nextDate.getDate() + 1);
      else if (autoBackupFrequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
      else if (autoBackupFrequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
      setNextAutoBackup(nextDate.toISOString());
      
      toast.success(language === "fr" ? "Sauvegarde automatique activée" : "Automatic backup enabled");
    } else {
      setNextAutoBackup(null);
      toast.info(language === "fr" ? "Sauvegarde automatique désactivée" : "Automatic backup disabled");
    }
  };

  const handleAutoBackupFrequencyChange = (frequency: 'daily' | 'weekly' | 'monthly') => {
    setAutoBackupFrequency(frequency);
    localStorage.setItem("auto_backup_frequency", frequency);
    
    // Recalculer la prochaine sauvegarde si activée
    if (autoBackupEnabled && lastAutoBackup) {
      const lastDate = new Date(lastAutoBackup);
      let nextDate = new Date(lastDate);
      if (frequency === 'daily') nextDate.setDate(nextDate.getDate() + 1);
      else if (frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
      else if (frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
      setNextAutoBackup(nextDate.toISOString());
    }
    
    toast.success(language === 'fr' ? `Fréquence de sauvegarde : ${frequency === 'daily' ? 'Quotidienne' : frequency === 'weekly' ? 'Hebdomadaire' : 'Mensuelle'}` : `Backup frequency: ${frequency === 'daily' ? 'Daily' : frequency === 'weekly' ? 'Weekly' : 'Monthly'}`);
  };

  const performAutoBackup = async () => {
    toast.info(language === "fr" ? "Sauvegarde automatique en cours..." : "Automatic backup in progress...");
    try {
      const success = await exportAllData();
      if (success) {
        const now = new Date().toISOString();
        setLastAutoBackup(now);
        localStorage.setItem("last_auto_backup", now);
        
        // Calculer la prochaine sauvegarde
        const nextDate = new Date();
        if (autoBackupFrequency === 'daily') nextDate.setDate(nextDate.getDate() + 1);
        else if (autoBackupFrequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
        else if (autoBackupFrequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        setNextAutoBackup(nextDate.toISOString());
        
        toast.success(language === "fr" ? "Sauvegarde automatique effectuée !" : "Automatic backup completed!");
      }
    } catch (error) {
      toast.error(language === "fr" ? "Erreur lors de la sauvegarde automatique" : "Error during automatic backup");
    }
  };

  // Vérifier si une sauvegarde automatique est due
  useEffect(() => {
    if (autoBackupEnabled && nextAutoBackup) {
      const checkBackupDue = () => {
        const now = new Date();
        const nextBackupDate = new Date(nextAutoBackup);
        if (now >= nextBackupDate) {
          performAutoBackup();
        }
      };
      
      // Vérifier au chargement
      checkBackupDue();
      
      // Vérifier toutes les heures
      const interval = setInterval(checkBackupDue, 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [autoBackupEnabled, nextAutoBackup, autoBackupFrequency]);

  // Gestion Catégories
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const id = uuidv4();
    await db.categories.add({
      id,
      label: newCategoryName.trim(),
      color: newCategoryColor,
      isDefault: false,
      accessType: newCategoryType // Add access type
    });
    setNewCategoryName("");
    toast.success(language === "fr" ? "Catégorie ajoutée" : "Category added");
  };

  const handleUpdateCategory = async () => {
    if (editingCategoryId && editingCategoryName.trim()) {
      await db.categories.update(editingCategoryId, { label: editingCategoryName.trim() });
      setEditingCategoryId(null);
      toast.success(language === "fr" ? "Catégorie mise à jour" : "Category updated");
    }
  };

  const handleDeleteCategory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering edit mode
    if (window.confirm(language === 'fr' ? "Attention : La suppression de cette catégorie entraînera la disparition de tous les albums et photos/documents qu'elle contient.\n\nCette action est irréversible. Voulez-vous continuer ?" : "Warning: Deleting this category will remove all albums and photos/documents it contains.\n\nThis action is irreversible. Do you want to continue?")) {
      await db.categories.delete(id);
      toast.success(language === "fr" ? "Catégorie supprimée" : "Category deleted");
    }
  };



  // Sécurité
  const handleUpdateMasterCode = async () => {
    if (newMasterCode !== confirmMasterCode) {
      toast.error(language === "fr" ? "Les codes ne correspondent pas" : "Codes do not match");
      return;
    }
    if (newMasterCode.length < 4) {
      toast.error(language === "fr" ? "Le code doit contenir au moins 4 caractères" : "Code must be at least 4 characters");
      return;
    }
    
    await db.settings.put({ key: 'master_code', value: newMasterCode });
    setNewMasterCode("");
    setConfirmMasterCode("");
    toast.success(language === "fr" ? "Code Maître mis à jour avec succès" : "Master Code updated successfully");
  };

  const handleSaveSessionSettings = () => {
    localStorage.setItem("inactivity_timeout", inactivityTimeout);
    localStorage.setItem("auto_logout_exempt_start", autoLogoutExemptStart);
    localStorage.setItem("auto_logout_exempt_end", autoLogoutExemptEnd);
    toast.success(language === "fr" ? "Paramètres de session enregistrés" : "Session settings saved");
    
    // Force reload pour appliquer les changements dans AuthContext (via storage event ou reload)
    window.location.reload();
  };

  // Réinitialisation d'usine
  const handleFactoryReset = async () => {
    if (factoryResetConfirmText !== "REINITIALISER") {
      toast.error(language === "fr" ? "Veuillez taper REINITIALISER pour confirmer" : "Please type RESET to confirm");
      return;
    }
    
    setIsResetting(true);
    try {
      // Supprimer toutes les données de la base IndexedDB
      await db.albums.clear();
      await db.album_metas.clear();
      await db.categories.clear();
      await db.settings.clear();
      
      // Recréer les 4 catégories NON CLASSEE par défaut (non effaçables)
      // 1. Photos & Vidéos - Standard
      // 2. Documents - Standard  
      // 3. Photos & Vidéos - Privé/Sécurisé
      // 4. Documents - Privé/Sécurisé
      const defaultCategories = [
        {
          id: 'cat_nc_photos',
          label: 'NON CLASSEE',
          color: '#9CA3AF',
          series: 'photoclass' as const,
          accessType: 'standard' as const,
          mediaType: 'mixed' as const,
          isDefault: true
        },
        {
          id: 'cat_nc_docs',
          label: 'NON CLASSEE',
          color: '#9CA3AF',
          series: 'classpapiers' as const,
          accessType: 'standard' as const,
          mediaType: 'documents' as const,
          isDefault: true
        },
        {
          id: 'cat_sec_nc_photos',
          label: 'NON CLASSEE',
          color: '#9CA3AF',
          series: 'photoclass' as const,
          accessType: 'secure' as const,
          mediaType: 'mixed' as const,
          isDefault: true
        },
        {
          id: 'cat_sec_nc_docs',
          label: 'NON CLASSEE',
          color: '#9CA3AF',
          series: 'classpapiers' as const,
          accessType: 'secure' as const,
          mediaType: 'documents' as const,
          isDefault: true
        }
      ];
      
      await db.categories.bulkAdd(defaultCategories);
      
      // Recréer les albums "Non classées" par défaut
      const nowTimestamp = Date.now();
      const defaultAlbumsMeta = [
        {
          id: 'album_nc_photos',
          title: language === 'fr' ? 'Non classées' : 'Uncategorized',
          type: 'standard' as const,
          series: 'photoclass' as const,
          createdAt: nowTimestamp,
          categoryId: 'cat_nc_photos'
        },
        {
          id: 'album_nc_docs',
          title: 'Non classées',
          type: 'standard' as const,
          series: 'classpapiers' as const,
          createdAt: nowTimestamp,
          categoryId: 'cat_nc_docs'
        }
      ];
      
      for (const albumMeta of defaultAlbumsMeta) {
        await db.albums.add({
          id: albumMeta.id,
          frames: [],
          updatedAt: nowTimestamp
        });
        await db.album_metas.add(albumMeta);
      }
      
      // Réinitialiser le mot de passe maître
      await db.settings.put({ key: 'master_code', value: '000000' });
      
      setShowFactoryResetDialog(false);
      setFactoryResetConfirmText("");
      toast.success(t('toast.factoryResetComplete'));
      
      // Rediriger vers l'accueil
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      console.error("Erreur lors de la réinitialisation:", error);
      toast.error(t('toast.factoryResetError'));
    } finally {
      setIsResetting(false);
    }
  };

  // Sauvegarde - Export
  const handleExport = async () => {
    setIsExporting(true);
    toast.info(t('toast.preparingBackup'));
    try {
      const success = await exportAllData();
      if (success) {
        toast.success(t('toast.backupDownloaded'));
      } else {
        toast.error(t('toast.backupError'));
      }
    } catch (error) {
      toast.error(t('toast.unexpectedError'));
    } finally {
      setIsExporting(false);
    }
  };

  // Sauvegarde - Import
  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Valider le fichier
    const validation = await validateBackupFile(file);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    setImportFile(file);
    setImportFileInfo(validation.info || null);
    setShowImportDialog(true);
    
    // Réinitialiser l'input pour permettre de sélectionner le même fichier
    if (importFileInputRef.current) {
      importFileInputRef.current.value = '';
    }
  };

  const handleImportConfirm = async () => {
    if (!importFile) return;

    setIsImporting(true);
    toast.info(language === "fr" ? "Importation en cours..." : "Import in progress...");

    try {
      const result = await importAllData(importFile, importMode);
      if (result.success) {
        toast.success(result.message);
        setShowImportDialog(false);
        setImportFile(null);
        setImportFileInfo(null);
        // Recharger la page pour afficher les nouvelles données
        window.location.reload();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Une erreur inattendue est survenue lors de l'import.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportCancel = () => {
    setShowImportDialog(false);
    setImportFile(null);
    setImportFileInfo(null);
  };

  return (
    <MainLayout title={t('settings.title')} className="no-scroll">
      {/* LOCK SCREEN MODAL */}
      <Dialog open={showLockScreen} onOpenChange={(open) => !open && handleCancelUnlock()}>
        <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Lock className="w-5 h-5" /> {t('settings.restrictedAccess')}
            </DialogTitle>
            <DialogDescription>
              {t('settings.sectionReserved')}
              <br/>{t('settings.enterMasterCode')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              type="password"
              placeholder={t('settings.masterCodePlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              autoFocus
              className="text-center text-lg tracking-widest"
            />
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={handleCancelUnlock}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUnlock} className="bg-red-600 hover:bg-red-700 text-white">
              {t('privateAlbums.unlock')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONTENU FLOU SI VERROUILLÉ */}
      <div className={`h-full flex flex-col p-4 transition-all duration-500 relative ${showLockScreen ? 'filter blur-md pointer-events-none opacity-50 select-none' : ''}`}>
        
        {/* BOUTON QUITTER (en bas à droite, à l'intérieur du cadre bleu) */}
        <Button
          variant="destructive"
          onClick={() => setShowQuitModal(true)}
          className="absolute bottom-4 right-4 z-40 shadow-lg"
        >
          {t('common.quit')}
        </Button>
        
        <Tabs defaultValue="general" className="flex-1 flex flex-col">
          
          {/* Barre d'onglets */}
          <div className="flex justify-center mb-4 shrink-0">
            <TabsList className="grid w-full max-w-5xl grid-cols-5 h-12 bg-white/80 backdrop-blur-sm shadow-sm border">
              <TabsTrigger value="general" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600">
                <User className="w-4 h-4" /> {t('settings.general')}
              </TabsTrigger>
              <TabsTrigger value="personnalisation" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600">
                <Palette className="w-4 h-4" /> {t('settings.personalization')}
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600">
                <Shield className="w-4 h-4" /> {t('settings.security')}
              </TabsTrigger>
              <TabsTrigger value="backups" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600">
                <Save className="w-4 h-4" /> {t('settings.backups')}
              </TabsTrigger>
              <TabsTrigger value="infos" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600">
                <Info className="w-4 h-4" /> {t('settings.infosLicense')}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Contenu des onglets */}
          <div className="flex-1 px-2 pb-4">
            <div className="max-w-4xl mx-auto space-y-3">

              {/* --- ONGLET 1: GÉNÉRAL --- */}
              <TabsContent value="general" className="space-y-6 mt-0">
                <div className="p-4">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" /> {t('settings.personalInfo')}
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('settings.lastName')}</Label>
                      <Input placeholder={t('settings.yourLastName')} value={userInfo.nom} onChange={e => setUserInfo({...userInfo, nom: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('settings.firstName')}</Label>
                      <Input placeholder={t('settings.yourFirstName')} value={userInfo.prenom} onChange={e => setUserInfo({...userInfo, prenom: e.target.value})} />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>{t('settings.address')}</Label>
                      <Input placeholder={t('settings.yourAddress')} value={userInfo.adresse} onChange={e => setUserInfo({...userInfo, adresse: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('settings.email')}</Label>
                      <Input placeholder={t('settings.emailPlaceholder')} value={userInfo.email} onChange={e => setUserInfo({...userInfo, email: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('settings.phone')}</Label>
                      <Input placeholder={t('settings.phonePlaceholder')} value={userInfo.portable} onChange={e => setUserInfo({...userInfo, portable: e.target.value})} />
                    </div>
                  </div>
                </div>


              </TabsContent>

              {/* --- ONGLET PERSONNALISATION --- */}
              <TabsContent value="personnalisation" className="mt-0 flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
                
                {/* Zone scrollable */}
                <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 pb-4">
                
                {/* Section Avatar */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('settings.wantAvatar')}</h3>
                  
                  <div className="flex items-start gap-6">
                    {/* Aperçu Avatar */}
                    <div className="shrink-0">
                      <div 
                        data-avatar-preview
                        className="w-20 h-20 rounded-full border-4 border-blue-200 shadow-lg overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center"
                        style={{
                          backgroundImage: localStorage.getItem('user_avatar') ? `url(${localStorage.getItem('user_avatar')})` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        {!localStorage.getItem('user_avatar') && <User className="w-10 h-10 text-blue-400" />}
                      </div>
                    </div>

                    {/* Bouton Choisir une image */}
                    <div className="flex flex-col gap-3">
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/jpeg,image/png,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) {
                              toast.error(t('toast.imageTooLarge'));
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const dataUrl = event.target?.result as string;
                              localStorage.setItem('user_avatar', dataUrl);
                              toast.success(t('toast.avatarUpdated'));
                              // Forcer la mise à jour de l'affichage sans recharger la page
                              const avatarPreview = document.querySelector('[data-avatar-preview]') as HTMLDivElement;
                              if (avatarPreview) {
                                avatarPreview.style.backgroundImage = `url(${dataUrl})`;
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <Button 
                        type="button"
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          document.getElementById('avatar-upload')?.click();
                        }}
                      >
                        <Upload className="w-4 h-4" />
                        {t('settings.chooseImage')}
                      </Button>
                    </div>

                    {/* Options Pixabay et téléchargement */}
                    <div className="flex-1 space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>{t('settings.findAvatarPixabay')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <a 
                          href="https://pixabay.com/fr/images/search/avatar/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          https://pixabay.com/fr/images/search/avatar...
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>{t('settings.orUploadPhoto')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <input type="checkbox" checked disabled className="w-4 h-4" />
                        <span>{t('settings.useChooseImage')}</span>
                      </div>
                    </div>
                  </div>

                  {localStorage.getItem('user_avatar') && (
                    <div className="mt-4 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => {
                          localStorage.removeItem('user_avatar');
                          toast.success(t('toast.avatarDeleted'));
                          window.location.reload();
                        }}
                      >
                        {t('settings.removeAvatar')}
                      </Button>
                    </div>
                  )}
                </div>

                
                </div>
                {/* Fin zone scrollable */}

              </TabsContent>

              {/* --- ONGLET 3: SÉCURITÉ --- */}
              <TabsContent value="security" className="space-y-3 mt-0">
                
                {/* Code Maître */}
                <div className="p-3">
                  <h2 className="text-base font-bold text-purple-800 mb-2 flex items-center gap-2">
                    <Lock className="w-5 h-5" /> {t('settings.masterCode')}
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        {t('settings.masterCodeDesc')}
                      </p>
                      <div className="space-y-2">
                        <Label>{t('settings.newCode')}</Label>
                        <Input 
                          type="password" 
                          value={newMasterCode} 
                          onChange={(e) => setNewMasterCode(e.target.value)}
                          placeholder={t('settings.min4chars')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('settings.confirmCode')}</Label>
                        <Input 
                          type="password" 
                          value={confirmMasterCode} 
                          onChange={(e) => setConfirmMasterCode(e.target.value)}
                          placeholder={t('settings.repeatCode')}
                        />
                      </div>
                      <Button onClick={handleUpdateMasterCode} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                        {t('settings.updateCode')}
                      </Button>
                    </div>
                    
                    {/* Paramètres de session */}
                    <div className="space-y-2 border-l pl-4">
                      <h3 className="font-semibold text-gray-700">{t('settings.sessionDisconnect')}</h3>
                      
                      <div className="space-y-2">
                        <Label>{t('settings.inactivityDelay')}</Label>
                        <select 
                          className="w-full h-10 px-3 rounded-md border border-gray-300"
                          value={inactivityTimeout}
                          onChange={(e) => setInactivityTimeout(e.target.value)}
                        >
                          <option value="5">5 {t('settings.minutes')}</option>
                          <option value="10">10 {t('settings.minutes')} ({t('settings.recommended')})</option>
                          <option value="30">30 {t('settings.minutes')}</option>
                          <option value="60">1 {t('settings.hour')}</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>{t('settings.noDisconnectTimeRange')}</Label>
                        <div className="flex items-center gap-2">
                          <Input type="time" value={autoLogoutExemptStart} onChange={(e) => setAutoLogoutExemptStart(e.target.value)} className="w-32" />
                          <span>{t('settings.to')}</span>
                          <Input type="time" value={autoLogoutExemptEnd} onChange={(e) => setAutoLogoutExemptEnd(e.target.value)} className="w-32" />
                        </div>
                      </div>

                      <Button onClick={handleSaveSessionSettings} variant="outline" className="w-full">
                        {t('settings.saveSessionSettings')}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Contrôle Parental */}
                <div className="p-3">
                  <h2 className="text-base font-bold text-orange-800 mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5" /> {t('settings.parentalControl')}
                  </h2>
                  
                  <div className="bg-orange-50 p-2 rounded-lg mb-2 border border-orange-200">
                    <p className="text-orange-800 font-medium flex items-center gap-2">
                      <Info className="w-5 h-5" />
                      {t('settings.aiAnalysis')}
                    </p>
                  </div>

                  <div className="space-y-2 px-2">
                    <div className="flex justify-between text-sm font-medium text-gray-500 mb-2">
                      <span>{t('settings.disabled')}</span>
                      <span>{t('settings.moderate')}</span>
                      <span>{t('settings.strict')}</span>
                      <span className="text-red-600 font-bold">{t('settings.veryStrict')}</span>
                    </div>
                    
                    <input 
                      type="range" 
                      min="0" 
                      max="5" 
                      step="1" 
                      value={parentalFilterLevel}
                      onChange={(e) => setParentalFilterLevel(parseInt(e.target.value))}
                      className="parental-slider"
                    />
                    
                    <div className="text-center">
                      <span className="inline-block px-4 py-2 bg-orange-100 text-orange-800 rounded-full font-bold text-lg border border-orange-200">
                        {t('settings.currentLevel')} : {parentalFilterLevel} / 5
                      </span>
                      <p className="text-gray-500 mt-2 text-sm">
                        {t('settings.level5Desc')}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* --- ONGLET 4: SAUVEGARDES --- */}
              <TabsContent value="backups" className="mt-0">
                <div className="p-4">
                  <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Save className="w-5 h-5 text-blue-600" /> {t('settings.backupRecovery')}
                  </h2>
                  
                  {/* Grille 2x2 compacte */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Export */}
                    <div className="border rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer group" onClick={handleExport}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                          <Save className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800 group-hover:text-blue-700">{t('settings.createBackup')}</h3>
                          <p className="text-xs text-gray-600">{t('settings.downloadAlbums')}</p>
                        </div>
                        <Button size="sm" disabled={isExporting}>
                          {isExporting ? "..." : t('settings.download')}
                        </Button>
                      </div>
                    </div>

                    {/* Restauration / Import */}
                    <div 
                      className="border rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer group"
                      onClick={() => importFileInputRef.current?.click()}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                          <Upload className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800 group-hover:text-green-700">{t('settings.restoreBackup')}</h3>
                          <p className="text-xs text-gray-600">{t('settings.importBackupFile')}</p>
                        </div>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={isImporting}>
                          {isImporting ? "..." : t('settings.import')}
                        </Button>
                        <input
                          ref={importFileInputRef}
                          type="file"
                          accept=".json,application/json"
                          onChange={handleImportFileSelect}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {/* Sauvegarde automatique */}
                    <div className="border rounded-lg p-3 bg-gradient-to-r from-purple-50 to-indigo-50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-full">
                          <Save className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800">{t('settings.autoBackup')}</h3>
                          <p className="text-xs text-gray-600">{t('settings.scheduleBackups')}</p>
                        </div>
                        <Switch
                          checked={autoBackupEnabled}
                          onCheckedChange={handleAutoBackupToggle}
                        />
                      </div>
                      {autoBackupEnabled && (
                        <div className="mt-2 pt-2 border-t border-purple-200">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant={autoBackupFrequency === 'daily' ? 'default' : 'outline'}
                              onClick={() => handleAutoBackupFrequencyChange('daily')}
                              className={`text-xs px-2 ${autoBackupFrequency === 'daily' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                            >
                              {t('settings.day')}
                            </Button>
                            <Button
                              size="sm"
                              variant={autoBackupFrequency === 'weekly' ? 'default' : 'outline'}
                              onClick={() => handleAutoBackupFrequencyChange('weekly')}
                              className={`text-xs px-2 ${autoBackupFrequency === 'weekly' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                            >
                              {t('settings.week')}
                            </Button>
                            <Button
                              size="sm"
                              variant={autoBackupFrequency === 'monthly' ? 'default' : 'outline'}
                              onClick={() => handleAutoBackupFrequencyChange('monthly')}
                              className={`text-xs px-2 ${autoBackupFrequency === 'monthly' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                            >
                              {t('settings.month')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Nettoyage des catégories inutiles */}
                    <div className="border rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer group" onClick={async () => {
                      try {
                        const result = await cleanupUnnecessaryCategories();
                        toast.success(t('toast.cleanupComplete').replace('{count}', result.deletedCount.toString()));
                      } catch (error) {
                        toast.error(t('toast.cleanupError'));
                      }
                    }}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-full group-hover:bg-orange-200 transition-colors">
                          <Trash2 className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800 group-hover:text-orange-700">{t('settings.cleanCategories')}</h3>
                          <p className="text-xs text-gray-600">{t('settings.deleteUnused')}</p>
                        </div>
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                          {t('settings.clean')}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Réinitialisation d'usine - Pleine largeur en bas */}
                  <div className="mt-3 border-2 border-red-300 rounded-lg p-3 bg-gradient-to-r from-red-50 to-orange-50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-full">
                        <RotateCcw className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-red-700">{t('settings.factoryReset')}</h3>
                        <p className="text-xs text-gray-600">
                          {t('settings.resetDesc')}
                          <span className="text-red-600 font-medium ml-1">⚠️ {t('settings.irreversible')}</span>
                        </p>
                      </div>
                      <Button 
                        size="sm"
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => setShowFactoryResetDialog(true)}
                      >
                        {t('settings.reset')}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* --- ONGLET 5: INFOS & LICENCE --- */}
              <TabsContent value="infos" className="space-y-6 mt-0">
                <div className="p-4">
                  <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-600" /> {t('settings.legalInfo')}
                  </h2>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg flex items-center gap-3 hover:bg-gray-50 cursor-pointer">
                      <span className="text-2xl">📄</span>
                      <span className="font-semibold text-gray-700">{t('settings.termsOfUse')}</span>
                    </div>
                    <div className="p-4 border rounded-lg flex items-center gap-3 hover:bg-gray-50 cursor-pointer">
                      <span className="text-2xl">⚖️</span>
                      <span className="font-semibold text-gray-700">{t('settings.legalNotice')}</span>
                    </div>
                    <div className="p-4 border rounded-lg flex items-center gap-3 hover:bg-gray-50 cursor-pointer">
                      <span className="text-2xl">🔒</span>
                      <span className="font-semibold text-gray-700">{t('settings.privacyPolicy')}</span>
                    </div>
                    <div className="p-4 border rounded-lg flex items-center gap-3 bg-green-50 border-green-200">
                      <span className="text-2xl">🔄</span>
                      <span className="font-semibold text-green-800">{t('settings.perpetualLicense')}</span>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Section Mes Licences */}
                  <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
                    <h3 className="text-lg font-bold text-purple-800 mb-3 flex items-center gap-2">
                      <span className="text-2xl">🔑</span> {t('settings.myLicenses')}
                    </h3>
                    <p className="text-purple-600 mb-4">{t('settings.myLicensesDesc')}</p>
                    <Button 
                      onClick={() => setLocation('/mes-licences')}
                      className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                    >
                      🔑 {t('settings.manageLicenses')}
                    </Button>
                  </div>

                  <Separator className="my-8" />

                  <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-center">
                    <h3 className="text-xl font-bold text-blue-800 mb-2">{t('settings.needHelp')}</h3>
                    <p className="text-blue-600 mb-6">{t('settings.supportAvailable')}</p>
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                      📞 {t('settings.contactSupport')}
                    </Button>
                  </div>
                </div>
              </TabsContent>

            </div>
          </div>
        </Tabs>
      </div>

      {/* Modale de confirmation d'import */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="w-5 h-5 text-green-600" />
              {t('settings.restoreBackup')}
            </DialogTitle>
            <DialogDescription>
              {t('settings.verifyBeforeImport')}
            </DialogDescription>
          </DialogHeader>

          {importFileInfo && (
            <div className="space-y-4">
              {/* Informations du fichier */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('settings.file')}</span>
                  <span className="font-medium text-gray-800">{importFile?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('settings.backupDate')}</span>
                  <span className="font-medium text-gray-800">
                    {new Date(importFileInfo.timestamp).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('settings.albumsCount')}</span>
                  <span className="font-medium text-blue-600">{importFileInfo.albumsCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('settings.categoriesCount')}</span>
                  <span className="font-medium text-purple-600">{importFileInfo.categoriesCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('settings.settingsIncluded')}</span>
                  <span className="font-medium text-orange-600">{importFileInfo.settingsCount}</span>
                </div>
              </div>

              {/* Mode d'import */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('settings.importMode')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      importMode === 'merge'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setImportMode('merge')}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        importMode === 'merge' ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                        {importMode === 'merge' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                      </div>
                      <span className="font-medium text-sm">{t('settings.merge')}</span>
                    </div>
                    <p className="text-xs text-gray-500 ml-6">
                      {t('settings.mergeDesc')}
                    </p>
                  </div>
                  <div
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      importMode === 'replace'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setImportMode('replace')}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        importMode === 'replace' ? 'border-orange-500' : 'border-gray-300'
                      }`}>
                        {importMode === 'replace' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                      </div>
                      <span className="font-medium text-sm">{t('settings.replace')}</span>
                    </div>
                    <p className="text-xs text-gray-500 ml-6">
                      {t('settings.replaceDesc')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Avertissement pour le mode remplacement */}
              {importMode === 'replace' && (
                <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    {t('settings.replaceWarning')}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleImportCancel} disabled={isImporting}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleImportConfirm}
              disabled={isImporting}
              className={importMode === 'replace' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {isImporting ? t('settings.importing') : importMode === 'replace' ? t('settings.replaceAll') : t('settings.merge')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* MODALE CONFIRMATION QUITTER */}
      <QuitConfirmModal
        isOpen={showQuitModal}
        onClose={() => setShowQuitModal(false)}
      />

      {/* MODALE RÉINITIALISATION D'USINE */}
      <AlertDialog open={showFactoryResetDialog} onOpenChange={setShowFactoryResetDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              {t('settings.factoryReset')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700">
              <div className="space-y-3 mt-2">
                <p className="font-semibold text-red-600">
                  ⚠️ {t('settings.warningIrreversible')}
                </p>
                <p>{t('settings.allDataDeleted')}</p>
                <ul className="list-disc list-inside text-sm space-y-1 bg-red-50 p-3 rounded-lg">
                  <li>{t('settings.allCategories')}</li>
                  <li>{t('settings.allAlbums')}</li>
                  <li>{t('settings.allPhotosAndDocs')}</li>
                  <li>{t('settings.allCustomSettings')}</li>
                </ul>
                <p className="text-sm">{t('settings.appResetToInitial')}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">
              {t('settings.typeToConfirm')} <span className="font-bold text-red-600">{t('settings.resetKeyword')}</span> :
            </label>
            <Input
              value={factoryResetConfirmText}
              onChange={(e) => setFactoryResetConfirmText(e.target.value.toUpperCase())}
              placeholder={t('settings.typeResetPlaceholder')}
              className="border-red-300 focus:border-red-500"
            />
          </div>

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel onClick={() => setFactoryResetConfirmText("")}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFactoryReset}
              disabled={factoryResetConfirmText !== "REINITIALISER" || isResetting}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResetting ? t('settings.resetting') : t('settings.confirmReset')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
