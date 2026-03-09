import MainLayout from "@/components/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  HelpCircle, 
  BookOpen, 
  Camera, 
  FileText, 
  Palette, 
  Shield, 
  Settings, 
  Mail, 
  Phone, 
  MessageCircle,
  Video,
  Image,
  FolderOpen,
  Lock,
  Download,
  Upload,
  Printer,
  Trash2,
  Edit,
  Search,
  ChevronRight,
  Cloud,
  Scissors,
  Wand2,
  Layers,
  LayoutGrid,
  Play,
  HelpCircle as FAQ,
  Sun,
  Contrast,
  Crop,
  RotateCw,
  FlipHorizontal,
  Sparkles,
  Droplets,
  Focus,
  Eraser,
  PaintBucket,
  ZoomIn,
  Move,
  Type,
  Frame,
  Share2
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SymbolWithTooltip } from "@/components/SymbolWithTooltip";
import CloudStorageGuide from "@/components/CloudStorageGuide";

interface HelpSection {
  id: string;
  titleFr: string;
  titleEn: string;
  icon: React.ReactNode;
  contentFr: React.ReactNode;
  contentEn: React.ReactNode;
}

export default function Aide() {
  const { language } = useLanguage();
  const [activeSection, setActiveSection] = useState<string>("getting-started");

  const helpSections: HelpSection[] = [
    {
      id: "getting-started",
      titleFr: "Premiers pas",
      titleEn: "Getting Started",
      icon: <BookOpen className="w-5 h-5" />,
      contentFr: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Bienvenue dans DuoClass !</h3>
          <p className="text-gray-600">
            DuoClass est votre application de gestion de photos et documents. Voici comment commencer :
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li><strong>Créez vos catégories</strong> : Organisez vos fichiers en créant des catégories personnalisées.</li>
            <li><strong>Créez vos albums</strong> : Dans chaque catégorie, créez des albums pour regrouper vos photos et documents.</li>
            <li><strong>Importez vos fichiers</strong> : Utilisez le bouton "Importer" pour ajouter vos photos et documents.</li>
            <li><strong>Personnalisez l'interface</strong> : Allez dans "Thèmes" pour choisir les couleurs qui vous plaisent.</li>
          </ol>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Welcome to DuoClass!</h3>
          <p className="text-gray-600">
            DuoClass is your photo and document management application. Here's how to get started:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li><strong>Create your categories</strong>: Organize your files by creating custom categories.</li>
            <li><strong>Create your albums</strong>: Within each category, create albums to group your photos and documents.</li>
            <li><strong>Import your files</strong>: Use the "Import" button to add your photos and documents.</li>
            <li><strong>Customize the interface</strong>: Go to "Themes" to choose the colors you like.</li>
          </ol>
        </div>
      )
    },
    {
      id: "albums",
      titleFr: "Gestion des Albums",
      titleEn: "Album Management",
      icon: <FolderOpen className="w-5 h-5" />,
      contentFr: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Comment gérer vos albums</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><FolderOpen className="w-4 h-4 text-blue-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Créer un album</p>
                <p className="text-sm text-gray-600">Cliquez sur "Créer catégorie/album" et suivez les étapes.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><Edit className="w-4 h-4 text-green-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Renommer un album</p>
                <p className="text-sm text-gray-600">Cliquez sur l'icône de modification à côté du nom de l'album.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><Trash2 className="w-4 h-4 text-red-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Supprimer un album</p>
                <p className="text-sm text-gray-600">Cliquez sur l'icône corbeille. Attention : cette action est irréversible.</p>
              </div>
            </div>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">How to manage your albums</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><FolderOpen className="w-4 h-4 text-blue-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Create an album</p>
                <p className="text-sm text-gray-600">Click on "Create category/album" and follow the steps.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><Edit className="w-4 h-4 text-green-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Rename an album</p>
                <p className="text-sm text-gray-600">Click on the edit icon next to the album name.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><Trash2 className="w-4 h-4 text-red-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Delete an album</p>
                <p className="text-sm text-gray-600">Click on the trash icon. Warning: this action is irreversible.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "photos",
      titleFr: "Photos & Vidéos",
      titleEn: "Photos & Videos",
      icon: <Camera className="w-5 h-5" />,
      contentFr: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Gestion des photos et vidéos</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Upload className="w-4 h-4 text-blue-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Importer</p>
                <p className="text-sm text-gray-600">Glissez-déposez vos fichiers ou utilisez le bouton "Importer".</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Image className="w-4 h-4 text-purple-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Retoucher</p>
                <p className="text-sm text-gray-600">Sélectionnez une photo et cliquez sur "Retouches Photos" dans la barre d'outils.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 rounded-lg"><Video className="w-4 h-4 text-orange-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Diaporama</p>
                <p className="text-sm text-gray-600">Créez un diaporama de vos photos avec le bouton "Diaporama".</p>
              </div>
            </div>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Photo and video management</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Upload className="w-4 h-4 text-blue-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Import</p>
                <p className="text-sm text-gray-600">Drag and drop your files or use the "Import" button.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Image className="w-4 h-4 text-purple-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Edit</p>
                <p className="text-sm text-gray-600">Select a photo and click "Photo Editing" in the toolbar.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 rounded-lg"><Video className="w-4 h-4 text-orange-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Slideshow</p>
                <p className="text-sm text-gray-600">Create a slideshow of your photos with the "Slideshow" button.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "documents",
      titleFr: "Documents",
      titleEn: "Documents",
      icon: <FileText className="w-5 h-5" />,
      contentFr: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Gestion des documents</h3>
          <p className="text-gray-600">
            DuoClass vous permet de gérer tous vos documents importants : factures, contrats, courriers, etc.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><FileText className="w-4 h-4 text-green-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Formats supportés</p>
                <p className="text-sm text-gray-600">PDF, Word, Excel, images de documents scannés.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Search className="w-4 h-4 text-blue-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Recherche</p>
                <p className="text-sm text-gray-600">Retrouvez rapidement vos documents grâce à la recherche par nom.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg"><Printer className="w-4 h-4 text-indigo-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Impression</p>
                <p className="text-sm text-gray-600">Imprimez vos documents directement depuis l'application.</p>
              </div>
            </div>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Document management</h3>
          <p className="text-gray-600">
            DuoClass allows you to manage all your important documents: invoices, contracts, letters, etc.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><FileText className="w-4 h-4 text-green-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Supported formats</p>
                <p className="text-sm text-gray-600">PDF, Word, Excel, scanned document images.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Search className="w-4 h-4 text-blue-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Search</p>
                <p className="text-sm text-gray-600">Quickly find your documents using name search.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg"><Printer className="w-4 h-4 text-indigo-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Print</p>
                <p className="text-sm text-gray-600">Print your documents directly from the application.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "private-albums",
      titleFr: "Albums Privés",
      titleEn: "Private Albums",
      icon: <Lock className="w-5 h-5" />,
      contentFr: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Protection de vos données sensibles</h3>
          <p className="text-gray-600">
            Les albums privés sont protégés par un code secret. Idéal pour vos documents confidentiels.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><Shield className="w-4 h-4 text-red-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Accès sécurisé</p>
                <p className="text-sm text-gray-600">Un code maître est requis pour accéder aux albums privés.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Lock className="w-4 h-4 text-purple-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Déconnexion automatique</p>
                <p className="text-sm text-gray-600">Après un délai d'inactivité, l'accès est automatiquement verrouillé.</p>
              </div>
            </div>
          </div>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Important :</strong> N'oubliez pas votre code maître ! Il n'y a pas de récupération possible.
            </p>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Protecting your sensitive data</h3>
          <p className="text-gray-600">
            Private albums are protected by a secret code. Ideal for your confidential documents.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><Shield className="w-4 h-4 text-red-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Secure access</p>
                <p className="text-sm text-gray-600">A master code is required to access private albums.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Lock className="w-4 h-4 text-purple-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Automatic logout</p>
                <p className="text-sm text-gray-600">After a period of inactivity, access is automatically locked.</p>
              </div>
            </div>
          </div>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Important:</strong> Don't forget your master code! There is no recovery option.
            </p>
          </div>
        </div>
      )
    },
    {
      id: "themes",
      titleFr: "Personnalisation",
      titleEn: "Customization",
      icon: <Palette className="w-5 h-5" />,
      contentFr: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Personnalisez votre interface</h3>
          <p className="text-gray-600">
            Rendez DuoClass unique en choisissant vos couleurs et textures préférées.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Palette className="w-4 h-4 text-blue-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Thèmes de couleurs</p>
                <p className="text-sm text-gray-600">Choisissez parmi 10 thèmes : Classique, Nordique, Océan, Forêt...</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg"><Image className="w-4 h-4 text-amber-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Textures de fond</p>
                <p className="text-sm text-gray-600">Cuir, Marbre, Moiré, Or, Bambou... pour un look unique.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><Download className="w-4 h-4 text-green-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Sauvegarder vos configurations</p>
                <p className="text-sm text-gray-600">Enregistrez vos combinaisons préférées pour les retrouver facilement.</p>
              </div>
            </div>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Customize your interface</h3>
          <p className="text-gray-600">
            Make DuoClass unique by choosing your favorite colors and textures.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Palette className="w-4 h-4 text-blue-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Color themes</p>
                <p className="text-sm text-gray-600">Choose from 10 themes: Classic, Nordic, Ocean, Forest...</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg"><Image className="w-4 h-4 text-amber-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Background textures</p>
                <p className="text-sm text-gray-600">Leather, Marble, Moiré, Gold, Bamboo... for a unique look.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><Download className="w-4 h-4 text-green-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Save your configurations</p>
                <p className="text-sm text-gray-600">Save your favorite combinations to easily find them later.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "backup",
      titleFr: "Sauvegardes",
      titleEn: "Backups",
      icon: <Download className="w-5 h-5" />,
      contentFr: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Protégez vos données</h3>
          <p className="text-gray-600">
            Sauvegardez régulièrement vos albums et paramètres pour ne rien perdre.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Download className="w-4 h-4 text-blue-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Exporter une sauvegarde</p>
                <p className="text-sm text-gray-600">Allez dans Paramètres → Sauvegardes → Créer une sauvegarde.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><Upload className="w-4 h-4 text-green-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Restaurer une sauvegarde</p>
                <p className="text-sm text-gray-600">Importez un fichier de sauvegarde pour récupérer vos données.</p>
              </div>
            </div>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Conseil :</strong> Faites une sauvegarde au moins une fois par mois sur un disque externe ou dans le cloud.
            </p>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Protect your data</h3>
          <p className="text-gray-600">
            Regularly backup your albums and settings to avoid losing anything.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Download className="w-4 h-4 text-blue-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Export a backup</p>
                <p className="text-sm text-gray-600">Go to Settings → Backups → Create a backup.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><Upload className="w-4 h-4 text-green-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Restore a backup</p>
                <p className="text-sm text-gray-600">Import a backup file to recover your data.</p>
              </div>
            </div>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> Make a backup at least once a month on an external drive or in the cloud.
            </p>
          </div>
        </div>
      )
    },
    {
      id: "cloud-storage",
      titleFr: "Stockage Cloud",
      titleEn: "Cloud Storage",
      icon: <Cloud className="w-5 h-5" />,
      contentFr: (
        <CloudStorageGuide language="fr" />
      ),
      contentEn: (
        <CloudStorageGuide language="en" />
      )
    },
    {
      id: "retouches",
      titleFr: "Retouches Photos",
      titleEn: "Photo Editing",
      icon: <Wand2 className="w-5 h-5" />,
      contentFr: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Les 12 fonctions de retouche</h3>
          <p className="text-gray-600">
            DuoClass propose 12 outils de retouche professionnels pour améliorer vos photos.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-yellow-100 rounded-lg"><Sun className="w-4 h-4 text-yellow-600" /></div>
              <div>
                <p className="font-medium text-gray-800">☀️ Luminosité</p>
                <p className="text-xs text-gray-600">Éclaircir ou assombrir l'image</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-purple-100 rounded-lg"><Contrast className="w-4 h-4 text-purple-600" /></div>
              <div>
                <p className="font-medium text-gray-800">⚫⚪ Contraste</p>
                <p className="text-xs text-gray-600">Accentuer les différences clairs/foncés</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-orange-100 rounded-lg"><Droplets className="w-4 h-4 text-orange-600" /></div>
              <div>
                <p className="font-medium text-gray-800">🌈 Saturation</p>
                <p className="text-xs text-gray-600">Intensifier ou atténuer les couleurs</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-blue-100 rounded-lg"><Focus className="w-4 h-4 text-blue-600" /></div>
              <div>
                <p className="font-medium text-gray-800">🔍 Nettete</p>
                <p className="text-xs text-gray-600">Rendre l'image plus nette</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-green-100 rounded-lg"><Crop className="w-4 h-4 text-green-600" /></div>
              <div>
                <p className="font-medium text-gray-800">✂️ Recadrage</p>
                <p className="text-xs text-gray-600">Couper les bords indésirables</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-indigo-100 rounded-lg"><RotateCw className="w-4 h-4 text-indigo-600" /></div>
              <div>
                <p className="font-medium text-gray-800">🔄 Rotation</p>
                <p className="text-xs text-gray-600">Pivoter l'image (90°, 180°, libre)</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-pink-100 rounded-lg"><FlipHorizontal className="w-4 h-4 text-pink-600" /></div>
              <div>
                <p className="font-medium text-gray-800">🪞 Miroir</p>
                <p className="text-xs text-gray-600">Retourner horizontalement/verticalement</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-cyan-100 rounded-lg"><Sparkles className="w-4 h-4 text-cyan-600" /></div>
              <div>
                <p className="font-medium text-gray-800">✨ Amélioration auto</p>
                <p className="text-xs text-gray-600">Optimisation automatique par IA</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-gray-200 rounded-lg"><Image className="w-4 h-4 text-gray-600" /></div>
              <div>
                <p className="font-medium text-gray-800">⬜ Noir & Blanc</p>
                <p className="text-xs text-gray-600">Convertir en niveaux de gris</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-amber-100 rounded-lg"><Image className="w-4 h-4 text-amber-600" /></div>
              <div>
                <p className="font-medium text-gray-800">🟤 Sépia</p>
                <p className="text-xs text-gray-600">Effet photo ancienne</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-red-100 rounded-lg"><Eraser className="w-4 h-4 text-red-600" /></div>
              <div>
                <p className="font-medium text-gray-800">👁️ Yeux rouges</p>
                <p className="text-xs text-gray-600">Corriger l'effet yeux rouges</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-teal-100 rounded-lg"><PaintBucket className="w-4 h-4 text-teal-600" /></div>
              <div>
                <p className="font-medium text-gray-800">🎨 Filtres artistiques</p>
                <p className="text-xs text-gray-600">BD, Cinéma, Vintage, etc.</p>
              </div>
            </div>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">12 Editing Functions</h3>
          <p className="text-gray-600">
            DuoClass offers 12 professional editing tools to enhance your photos.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-yellow-100 rounded-lg"><Sun className="w-4 h-4 text-yellow-600" /></div>
              <div>
                <p className="font-medium text-gray-800">☀️ Brightness</p>
                <p className="text-xs text-gray-600">Lighten or darken the image</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-purple-100 rounded-lg"><Contrast className="w-4 h-4 text-purple-600" /></div>
              <div>
                <p className="font-medium text-gray-800">⚫⚪ Contrast</p>
                <p className="text-xs text-gray-600">Enhance light/dark differences</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-orange-100 rounded-lg"><Droplets className="w-4 h-4 text-orange-600" /></div>
              <div>
                <p className="font-medium text-gray-800">🌈 Saturation</p>
                <p className="text-xs text-gray-600">Intensify or mute colors</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-blue-100 rounded-lg"><Focus className="w-4 h-4 text-blue-600" /></div>
              <div>
                <p className="font-medium text-gray-800">🔍 Sharpness</p>
                <p className="text-xs text-gray-600">Make the image sharper</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-green-100 rounded-lg"><Crop className="w-4 h-4 text-green-600" /></div>
              <div>
                <p className="font-medium text-gray-800">✂️ Crop</p>
                <p className="text-xs text-gray-600">Remove unwanted edges</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-indigo-100 rounded-lg"><RotateCw className="w-4 h-4 text-indigo-600" /></div>
              <div>
                <p className="font-medium text-gray-800">🔄 Rotation</p>
                <p className="text-xs text-gray-600">Rotate the image (90°, 180°, free)</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-pink-100 rounded-lg"><FlipHorizontal className="w-4 h-4 text-pink-600" /></div>
              <div>
                <p className="font-medium text-gray-800">🪞 Mirror</p>
                <p className="text-xs text-gray-600">Flip horizontally/vertically</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-cyan-100 rounded-lg"><Sparkles className="w-4 h-4 text-cyan-600" /></div>
              <div>
                <p className="font-medium text-gray-800">✨ Auto Enhance</p>
                <p className="text-xs text-gray-600">AI-powered automatic optimization</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-gray-200 rounded-lg"><Image className="w-4 h-4 text-gray-600" /></div>
              <div>
                <p className="font-medium text-gray-800">⬜ Black & White</p>
                <p className="text-xs text-gray-600">Convert to grayscale</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-amber-100 rounded-lg"><Image className="w-4 h-4 text-amber-600" /></div>
              <div>
                <p className="font-medium text-gray-800">🟤 Sepia</p>
                <p className="text-xs text-gray-600">Vintage photo effect</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-red-100 rounded-lg"><Eraser className="w-4 h-4 text-red-600" /></div>
              <div>
                <p className="font-medium text-gray-800">👁️ Red Eye</p>
                <p className="text-xs text-gray-600">Fix red eye effect</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-teal-100 rounded-lg"><PaintBucket className="w-4 h-4 text-teal-600" /></div>
              <div>
                <p className="font-medium text-gray-800">🎨 Artistic Filters</p>
                <p className="text-xs text-gray-600">Comic, Cinema, Vintage, etc.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "creations",
      titleFr: "Créations / Atelier",
      titleEn: "Creations / Workshop",
      icon: <Scissors className="w-5 h-5" />,
      contentFr: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">L'Atelier Créatif</h3>
          <p className="text-gray-600">
            Créez des compositions uniques avec nos outils professionnels.
          </p>
          
          {/* Section Comment démarrer un projet */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <FolderOpen className="w-5 h-5 text-amber-600" />
              <h4 className="font-semibold text-amber-800">Comment démarrer un projet</h4>
            </div>
            <ol className="text-sm text-amber-700 space-y-2 list-decimal list-inside">
              <li><strong>📁 Créez un projet</strong> : Allez dans 📷 Albums → MES PROJETS CRÉATIONS → ➕ Créer un album</li>
              <li><strong>➕ Ajoutez des photos</strong> : Depuis n'importe quel album, clic droit sur une photo → "➕ Ajouter au projet"</li>
              <li><strong>✂️ Ouvrez l'Atelier</strong> : Cliquez sur "✂️ Créations" dans la barre d'outils et sélectionnez votre projet</li>
            </ol>
            <div className="mt-3 p-2 bg-amber-100 rounded-lg">
              <p className="text-xs text-amber-800">
                <strong>💡 Astuce :</strong> Vous pouvez aussi glisser des photos directement depuis votre bureau vers l'Atelier, sans les importer dans un album. Pratique pour travailler rapidement sans encombrer vos albums !
              </p>
            </div>
            <div className="mt-3 p-2 bg-blue-100 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>📷 Format recommandé :</strong> Si vos photos sont destinées à être agrandies (impression grand format, poster...), convertissez-les en <strong>PNG</strong> avant de les utiliser dans l'Atelier. Le format PNG préserve la qualité sans compression, contrairement au JPEG qui peut créer des artefacts visibles lors de l'agrandissement.
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Scissors className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-purple-800">{language === "fr" ? "Détourage" : "Cutout"}</h4>
              </div>
              <p className="text-sm text-purple-700 mb-2">Supprimez l'arrière-plan de vos photos pour isoler les sujets.</p>
              <ul className="text-xs text-purple-600 space-y-1">
                <li>• <strong>🤖 Détourage IA</strong> : Suppression automatique de l'arrière-plan</li>
                <li>• <strong>✏️ Lasso manuel</strong> : Dessinez le contour à la main</li>
                <li>• <strong>👁️ Aperçu</strong> : Vérifiez le résultat avant validation</li>
              </ul>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-800">Collage</h4>
              </div>
              <p className="text-sm text-blue-700 mb-2">Composez des montages avec plusieurs éléments.</p>
              <ul className="text-xs text-blue-600 space-y-1">
                <li>• <strong>🎯 Glisser-déposer</strong> : Ajoutez des éléments depuis la bibliothèque</li>
                <li>• <strong>↔️ Redimensionner</strong> : 8 poignées pour ajuster la taille</li>
                <li>• <strong>🔄 Rotation</strong> : Pivotez les éléments librement</li>
                <li>• <strong>📚 Calques</strong> : Gérez l'ordre d'affichage (avant/arrière-plan)</li>
                <li>• <strong>🎭 Masques</strong> : Appliquez des formes géométriques (cercle, étoile, cœur...)</li>
              </ul>
            </div>
            
            <div className="p-4 bg-pink-50 rounded-xl border border-pink-200">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-pink-600" />
                <h4 className="font-semibold text-pink-800">Effets Artistiques</h4>
              </div>
              <p className="text-sm text-pink-700 mb-2">Transformez vos photos avec des filtres créatifs.</p>
              <ul className="text-xs text-pink-600 space-y-1">
                <li>• <strong>💭 BD / Comics</strong> : Style bande dessinée</li>
                <li>• <strong>🎬 Cinéma</strong> : Effet film cinématographique</li>
                <li>• <strong>📼 Vintage</strong> : Look rétro années 70</li>
                <li>• <strong>🎨 Aquarelle</strong> : Effet peinture à l'eau</li>
              </ul>
            </div>
            
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <LayoutGrid className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-green-800">Mise en page</h4>
              </div>
              <p className="text-sm text-green-700 mb-2">Créez des pages de livre photo professionnelles.</p>
              <ul className="text-xs text-green-600 space-y-1">
                <li>• <strong>📐 Dispositions</strong> : Grilles et mosaïques prédéfinies</li>
                <li>• <strong>🖼️ Bordures</strong> : Cadres décoratifs (classiques, modernes, floraux)</li>
                <li>• <strong>📝 Texte</strong> : Ajoutez des titres et légendes</li>
                <li>• <strong>⭐ Formes</strong> : Éléments décoratifs et séparateurs</li>
              </ul>
            </div>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Creative Workshop</h3>
          <p className="text-gray-600">
            Create unique compositions with our professional tools.
          </p>
          
          {/* Section How to start a project */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <FolderOpen className="w-5 h-5 text-amber-600" />
              <h4 className="font-semibold text-amber-800">How to start a project</h4>
            </div>
            <ol className="text-sm text-amber-700 space-y-2 list-decimal list-inside">
              <li><strong>📁 Create a project</strong>: Go to 📷 Albums → MY CREATION PROJECTS → ➕ Create an album</li>
              <li><strong>➕ Add photos</strong>: From any album, right-click on a photo → "➕ Add to project"</li>
              <li><strong>✂️ Open the Workshop</strong>: Click "✂️ Creations" in the toolbar and select your project</li>
            </ol>
            <div className="mt-3 p-2 bg-amber-100 rounded-lg">
              <p className="text-xs text-amber-800">
                <strong>💡 Tip:</strong> You can also drag photos directly from your desktop to the Workshop, without importing them into an album. Handy for working quickly without cluttering your albums!
              </p>
            </div>
            <div className="mt-3 p-2 bg-blue-100 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>📷 Recommended format:</strong> If your photos are intended to be enlarged (large format printing, posters...), convert them to <strong>PNG</strong> before using them in the Workshop. PNG format preserves quality without compression, unlike JPEG which can create visible artifacts when enlarged.
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Scissors className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-purple-800">Cutout</h4>
              </div>
              <p className="text-sm text-purple-700 mb-2">Remove backgrounds from your photos to isolate subjects.</p>
              <ul className="text-xs text-purple-600 space-y-1">
                <li>• <strong>🤖 AI Cutout</strong>: Automatic background removal</li>
                <li>• <strong>✏️ Manual Lasso</strong>: Draw the outline by hand</li>
                <li>• <strong>👁️ Preview</strong>: Check the result before confirming</li>
              </ul>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-800">Collage</h4>
              </div>
              <p className="text-sm text-blue-700 mb-2">Compose montages with multiple elements.</p>
              <ul className="text-xs text-blue-600 space-y-1">
                <li>• <strong>🎯 Drag & Drop</strong>: Add elements from the library</li>
                <li>• <strong>↔️ Resize</strong>: 8 handles to adjust size</li>
                <li>• <strong>🔄 Rotation</strong>: Rotate elements freely</li>
                <li>• <strong>📚 Layers</strong>: Manage display order (front/back)</li>
                <li>• <strong>🎭 Masks</strong>: Apply geometric shapes (circle, star, heart...)</li>
              </ul>
            </div>
            
            <div className="p-4 bg-pink-50 rounded-xl border border-pink-200">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-pink-600" />
                <h4 className="font-semibold text-pink-800">Artistic Effects</h4>
              </div>
              <p className="text-sm text-pink-700 mb-2">Transform your photos with creative filters.</p>
              <ul className="text-xs text-pink-600 space-y-1">
                <li>• <strong>💭 Comic Book</strong>: Comic book style</li>
                <li>• <strong>🎬 Cinema</strong>: Cinematic film effect</li>
                <li>• <strong>📼 Vintage</strong>: Retro 70s look</li>
                <li>• <strong>🎨 Watercolor</strong>: Watercolor painting effect</li>
              </ul>
            </div>
            
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <LayoutGrid className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-green-800">Layout</h4>
              </div>
              <p className="text-sm text-green-700 mb-2">Create professional photo book pages.</p>
              <ul className="text-xs text-green-600 space-y-1">
                <li>• <strong>📐 Layouts</strong>: Predefined grids and mosaics</li>
                <li>• <strong>🖼️ Borders</strong>: Decorative frames (classic, modern, floral)</li>
                <li>• <strong>📝 Text</strong>: Add titles and captions</li>
                <li>• <strong>⭐ Shapes</strong>: Decorative elements and dividers</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "print-mail",
      titleFr: "Imprimer & @Mail",
      titleEn: "Print & @Mail",
      icon: <Printer className="w-5 h-5" />,
      contentFr: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Partager vos créations</h3>
          <p className="text-gray-600">
            Imprimez ou envoyez vos photos et créations par email.
          </p>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-xl">
              <div className="p-2 bg-indigo-100 rounded-lg"><Printer className="w-5 h-5 text-indigo-600" /></div>
              <div>
                <p className="font-medium text-indigo-800">🗸️ Imprimer</p>
                <p className="text-sm text-indigo-600 mb-2">Imprimez directement depuis l'application.</p>
                <ul className="text-xs text-indigo-500 space-y-1">
                  <li>✅ Sélectionnez une ou plusieurs photos</li>
                  <li>🔍 Cliquez sur "Imprimer" dans la barre d'outils</li>
                  <li>🎨 Choisissez le format et les options d'impression</li>
                  <li>📋 Formats supportés : 10x15, A4, A3, personnalisé</li>
                </ul>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
              <div className="p-2 bg-blue-100 rounded-lg"><Mail className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="font-medium text-blue-800">📧 @Mail</p>
                <p className="text-sm text-blue-600 mb-2">Envoyez vos photos par email.</p>
                <ul className="text-xs text-blue-500 space-y-1">
                  <li>✅ Sélectionnez les photos à envoyer</li>
                  <li>🔍 Cliquez sur "@Mail" dans la barre d'outils</li>
                  <li>📨 Votre client email s'ouvre automatiquement</li>
                  <li>🚀 Les photos sont optimisées pour l'envoi</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>💡 Astuce :</strong> Pour les créations (collages, montages), exportez d'abord en PNG haute qualité avant d'imprimer.
            </p>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Share Your Creations</h3>
          <p className="text-gray-600">
            Print or send your photos and creations by email.
          </p>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-xl">
              <div className="p-2 bg-indigo-100 rounded-lg"><Printer className="w-5 h-5 text-indigo-600" /></div>
              <div>
                <p className="font-medium text-indigo-800">🗸️ Print</p>
                <p className="text-sm text-indigo-600 mb-2">Print directly from the application.</p>
                <ul className="text-xs text-indigo-500 space-y-1">
                  <li>✅ Select one or more photos</li>
                  <li>🔍 Click "Print" in the toolbar</li>
                  <li>🎨 Choose format and print options</li>
                  <li>📋 Supported formats: 4x6, A4, A3, custom</li>
                </ul>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
              <div className="p-2 bg-blue-100 rounded-lg"><Mail className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="font-medium text-blue-800">📧 @Mail</p>
                <p className="text-sm text-blue-600 mb-2">Send your photos by email.</p>
                <ul className="text-xs text-blue-500 space-y-1">
                  <li>✅ Select photos to send</li>
                  <li>🔍 Click "@Mail" in the toolbar</li>
                  <li>📨 Your email client opens automatically</li>
                  <li>🚀 Photos are optimized for sending</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>💡 Tip:</strong> For creations (collages, montages), export to high-quality PNG first before printing.
            </p>
          </div>
        </div>
      )
    },
    {
      id: "slideshow",
      titleFr: "Diaporama",
      titleEn: "Slideshow",
      icon: <Play className="w-5 h-5" />,
      contentFr: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Créer un diaporama</h3>
          <p className="text-gray-600">
            Présentez vos photos avec des transitions élégantes.
          </p>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 rounded-lg"><Play className="w-4 h-4 text-orange-600" /></div>
              <div>
                <p className="font-medium text-gray-800">1️⃣ Sélectionner les photos</p>
                <p className="text-sm text-gray-600">Choisissez les photos à inclure dans le diaporama.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Settings className="w-4 h-4 text-purple-600" /></div>
              <div>
                <p className="font-medium text-gray-800">2️⃣ Configurer</p>
                <p className="text-sm text-gray-600">Choisissez la durée d'affichage et les transitions.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><Video className="w-4 h-4 text-green-600" /></div>
              <div>
                <p className="font-medium text-gray-800">3️⃣ Lancer</p>
                <p className="text-sm text-gray-600">Cliquez sur "Diaporama" pour démarrer la présentation.</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="font-medium text-gray-800 mb-2">Options disponibles :</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>⏱️ <strong>Durée</strong> : 3, 5, 10 ou 15 secondes par photo</li>
              <li>🌈 <strong>Transitions</strong> : Fondu, glissement, zoom</li>
              <li>🔄 <strong>Boucle</strong> : Répéter automatiquement</li>
              <li>📺 <strong>{language === "fr" ? "Plein écran" : "Full screen"}</strong> : Affichage immersif</li>
            </ul>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Create a Slideshow</h3>
          <p className="text-gray-600">
            Present your photos with elegant transitions.
          </p>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 rounded-lg"><Play className="w-4 h-4 text-orange-600" /></div>
              <div>
                <p className="font-medium text-gray-800">1️⃣ Select Photos</p>
                <p className="text-sm text-gray-600">Choose the photos to include in the slideshow.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Settings className="w-4 h-4 text-purple-600" /></div>
              <div>
                <p className="font-medium text-gray-800">2️⃣ Configure</p>
                <p className="text-sm text-gray-600">Choose display duration and transitions.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><Video className="w-4 h-4 text-green-600" /></div>
              <div>
                <p className="font-medium text-gray-800">3️⃣ Launch</p>
                <p className="text-sm text-gray-600">Click "Slideshow" to start the presentation.</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="font-medium text-gray-800 mb-2">Available options:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>⏱️ <strong>Duration</strong>: 3, 5, 10 or 15 seconds per photo</li>
              <li>🌈 <strong>Transitions</strong>: Fade, slide, zoom</li>
              <li>🔄 <strong>Loop</strong>: Repeat automatically</li>
              <li>📺 <strong>Fullscreen</strong>: Immersive display</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: "faq",
      titleFr: "FAQ",
      titleEn: "FAQ",
      icon: <HelpCircle className="w-5 h-5" />,
      contentFr: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Questions fréquentes</h3>
          
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="font-medium text-gray-800 mb-1">Comment récupérer mon code maître oublié ?</p>
              <p className="text-sm text-gray-600">Malheureusement, le code maître ne peut pas être récupéré. C'est une mesure de sécurité. Si vous l'avez oublié, vous devrez réinitialiser l'application.</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="font-medium text-gray-800 mb-1">Mes photos sont-elles stockées en ligne ?</p>
              <p className="text-sm text-gray-600">Par défaut, vos photos sont stockées localement sur votre appareil. Vous pouvez activer la synchronisation cloud dans les paramètres.</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="font-medium text-gray-800 mb-1">Quels formats d'image sont supportés ?</p>
              <p className="text-sm text-gray-600">JPEG, PNG, GIF, WebP, HEIC (iPhone). Pour les vidéos : MP4, MOV, WebM.</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="font-medium text-gray-800 mb-1">Comment annuler mon abonnement ?</p>
              <p className="text-sm text-gray-600">Allez dans Paramètres → Abonnement → Gérer. Vous pouvez annuler à tout moment, l'accès reste actif jusqu'à la fin de la période payée.</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="font-medium text-gray-800 mb-1">L'application fonctionne-t-elle hors ligne ?</p>
              <p className="text-sm text-gray-600">Oui ! DuoClass fonctionne en mode hors ligne. Seules les fonctions IA (détourage automatique, amélioration auto) nécessitent une connexion.</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="font-medium text-gray-800 mb-1">Comment transférer mes données vers un nouvel appareil ?</p>
              <p className="text-sm text-gray-600">Créez une sauvegarde complète (Paramètres → Sauvegardes), puis restaurez-la sur le nouvel appareil.</p>
            </div>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Frequently Asked Questions</h3>
          
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="font-medium text-gray-800 mb-1">How can I recover my forgotten master code?</p>
              <p className="text-sm text-gray-600">Unfortunately, the master code cannot be recovered. This is a security measure. If you've forgotten it, you'll need to reset the application.</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="font-medium text-gray-800 mb-1">Are my photos stored online?</p>
              <p className="text-sm text-gray-600">By default, your photos are stored locally on your device. You can enable cloud sync in the settings.</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="font-medium text-gray-800 mb-1">What image formats are supported?</p>
              <p className="text-sm text-gray-600">JPEG, PNG, GIF, WebP, HEIC (iPhone). For videos: MP4, MOV, WebM.</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="font-medium text-gray-800 mb-1">How do I cancel my subscription?</p>
              <p className="text-sm text-gray-600">Go to Settings → Subscription → Manage. You can cancel anytime, access remains active until the end of the paid period.</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="font-medium text-gray-800 mb-1">Does the app work offline?</p>
              <p className="text-sm text-gray-600">Yes! DuoClass works in offline mode. Only AI features (automatic cutout, auto enhance) require a connection.</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="font-medium text-gray-800 mb-1">How do I transfer my data to a new device?</p>
              <p className="text-sm text-gray-600">Create a full backup (Settings → Backups), then restore it on the new device.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "retractation",
      titleFr: "Droit de Rétractation",
      titleEn: "Right of Withdrawal",
      icon: <Shield className="w-5 h-5" />,
      contentFr: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Votre droit de rétractation (14 jours)</h3>
          <p className="text-gray-600">
            Conformément à la loi, vous disposez d'un délai de <strong>14 jours calendaires</strong> pour vous rétracter après votre achat.
          </p>
          
          <div className="p-4 bg-red-50 rounded-xl border border-red-200">
            <div className="flex items-start gap-2 mb-2">
              <Shield className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Conditions de rétractation</p>
                <p className="text-sm text-red-800 mt-2">
                  <strong>Vous pouvez librement explorer et consulter l'application</strong> - visiter les pages, lire la documentation, examiner les fonctionnalités. Cela ne vous empêche pas de vous rétracter.
                </p>
                <p className="text-sm text-red-800 mt-2">
                  <strong>Cependant, vous ne pouvez pas effectuer d'actions concrètes</strong> sur l'application. Voici ce qui est <strong>INTERDIT</strong> :
                </p>
                <ul className="text-sm text-red-700 space-y-1 mt-2 ml-4 list-disc">
                  <li><strong>Import</strong> de photos ou documents</li>
                  <li><strong>Création</strong> d'albums ou compositions</li>
                  <li><strong>Utilisation</strong> des outils de retouche ou édition</li>
                  <li><strong>Export</strong> ou téléchargement de fichiers</li>
                  <li><strong>Modifications</strong> de paramètres ou catégories</li>
                </ul>
                <p className="text-sm text-green-700 font-semibold mt-3 p-2 bg-green-100 rounded">
                  ✅ Consulter, explorer, lire = AUTORISÉ
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="font-semibold text-blue-900 mb-2">Comment exercer votre droit ?</p>
            <p className="text-sm text-blue-800 mb-3">
              Remplissez le formulaire de rétractation avec vos informations. Notre équipe examinera votre demande et vous contactera pour confirmer.
            </p>
            <a href="/retractation" className="inline-block">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <FileText className="w-4 h-4 mr-2" />
                Formulaire de rétractation
              </Button>
            </a>
          </div>
          
          <div className="p-4 bg-green-50 rounded-xl border border-green-200">
            <p className="font-semibold text-green-900 mb-2">Remboursement garanti</p>
            <p className="text-sm text-green-800">
              Si votre demande est approuvée, vous recevrez un remboursement complet (100%) dans les <strong>14 jours</strong> suivant l'approbation.
            </p>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Your Right of Withdrawal (14 days)</h3>
          <p className="text-gray-600">
            In accordance with the law, you have <strong>14 calendar days</strong> to withdraw after your purchase.
          </p>
          
          <div className="p-4 bg-red-50 rounded-xl border border-red-200">
            <div className="flex items-start gap-2 mb-2">
              <Shield className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Withdrawal Conditions</p>
                <p className="text-sm text-red-800 mt-1">
                  You can withdraw <strong>only if you have not taken any action</strong> on the application:
                </p>
                <ul className="text-sm text-red-700 space-y-1 mt-2 ml-4 list-disc">
                  <li>No photo or document imports</li>
                  <li>No album or composition creation</li>
                  <li>No use of editing tools</li>
                  <li>No exports or downloads</li>
                  <li>Viewing pages and reading the guide = ALLOWED</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="font-semibold text-blue-900 mb-2">How to exercise your right?</p>
            <p className="text-sm text-blue-800 mb-3">
              Fill out the withdrawal form with your information. Our team will review your request and contact you to confirm.
            </p>
            <a href="/retractation" className="inline-block">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <FileText className="w-4 h-4 mr-2" />
                Withdrawal Form
              </Button>
            </a>
          </div>
          
          <div className="p-4 bg-green-50 rounded-xl border border-green-200">
            <p className="font-semibold text-green-900 mb-2">Guaranteed Refund</p>
            <p className="text-sm text-green-800">
              If your request is approved, you will receive a full refund (100%) within <strong>14 days</strong> of approval.
            </p>
          </div>
        </div>
      )
    },
    {
      id: "contact",
      titleFr: "Contact & Support",
      titleEn: "Contact & Support",
      icon: <MessageCircle className="w-5 h-5" />,
      contentFr: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Besoin d'aide ?</h3>
          <p className="text-gray-600">
            Notre équipe est là pour vous aider. N'hésitez pas à nous contacter.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Mail className="w-4 h-4 text-blue-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Email</p>
                <p className="text-sm text-gray-600">support@duoclass.fr</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><Phone className="w-4 h-4 text-green-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Téléphone</p>
                <p className="text-sm text-gray-600">01 23 45 67 89 (Lun-Ven, 9h-18h)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><MessageCircle className="w-4 h-4 text-purple-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Chat en ligne</p>
                <p className="text-sm text-gray-600">Disponible sur notre site web duoclass.fr</p>
              </div>
            </div>
          </div>
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4">
            <Mail className="w-4 h-4 mr-2" />
            Envoyer un message au support
          </Button>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Need help?</h3>
          <p className="text-gray-600">
            Our team is here to help you. Don't hesitate to contact us.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Mail className="w-4 h-4 text-blue-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Email</p>
                <p className="text-sm text-gray-600">support@duoclass.fr</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><Phone className="w-4 h-4 text-green-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Phone</p>
                <p className="text-sm text-gray-600">+33 1 23 45 67 89 (Mon-Fri, 9am-6pm CET)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><MessageCircle className="w-4 h-4 text-purple-600" /></div>
              <div>
                <p className="font-medium text-gray-800">Online chat</p>
                <p className="text-sm text-gray-600">Available on our website duoclass.fr</p>
              </div>
            </div>
          </div>
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4">
            <Mail className="w-4 h-4 mr-2" />
            Send a message to support
          </Button>
        </div>
      )
    }
  ];

  const activeContent = helpSections.find(s => s.id === activeSection);

  return (
    <MainLayout title={language === 'fr' ? 'Aide' : 'Help'}>
      <div className="h-full flex flex-col p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-800">
              {language === 'fr' ? 'Centre d\'aide DuoClass' : 'DuoClass Help Center'}
            </h1>
          </div>
          <button onClick={() => {
            const link = document.createElement('a');
            link.href = '/GUIDE_UTILISATION.pdf';
            link.download = 'DuoClass-Guide-Complet.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">{language === 'fr' ? 'Télécharger le guide PDF' : 'Download PDF Guide'}</span>
          </button>
        </div>

        {/* Contenu principal - 2 colonnes */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Menu latéral */}
          <div className="w-64 shrink-0 overflow-y-auto">
            <nav className="space-y-1">
              {helpSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {section.icon}
                  <span className="flex-1 text-sm">
                    {language === 'fr' ? section.titleFr : section.titleEn}
                  </span>
                  {activeSection === section.id && (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Contenu de la section */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeContent && (
              language === 'fr' ? activeContent.contentFr : activeContent.contentEn
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
