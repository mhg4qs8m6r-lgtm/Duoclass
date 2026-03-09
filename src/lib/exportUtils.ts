import { db } from "../db";

// Interface pour les données d'export
interface ExportData {
  version: number;
  timestamp: string;
  albumsData: any[];
  albumsMeta: any[];
  categories?: any[]; // Optionnel pour compatibilité avec anciennes sauvegardes
  settings?: any[]; // Optionnel pour compatibilité avec anciennes sauvegardes
}

// Résultat de l'import
export interface ImportResult {
  success: boolean;
  message: string;
  stats?: {
    albumsImported: number;
    categoriesImported: number;
    settingsImported: number;
    albumsSkipped: number;
  };
}

export async function exportAllData() {
  try {
    const albumsData = await db.albums.toArray();
    const albumsMeta = await db.album_metas.toArray();

    // Récupérer aussi les catégories et les paramètres
    const categories = await db.categories.toArray();
    const settings = await db.settings.toArray();

    const exportData: ExportData = {
      version: 2, // Version 2 inclut les catégories et paramètres
      timestamp: new Date().toISOString(),
      albumsData,
      albumsMeta,
      categories,
      settings,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `duoclass-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error("Export failed:", error);
    return false;
  }
}


/**
 * Importe les données depuis un fichier de sauvegarde JSON
 * @param file - Le fichier JSON à importer
 * @param mode - 'merge' pour fusionner avec les données existantes, 'replace' pour tout remplacer
 * @returns ImportResult avec le statut et les statistiques
 */
export async function importAllData(file: File, mode: 'merge' | 'replace' = 'merge'): Promise<ImportResult> {
  try {
    // Lire le fichier
    const text = await file.text();
    let data: ExportData;
    
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        message: "Le fichier n'est pas un JSON valide."
      };
    }

    // Vérifier la structure du fichier
    if (!data.albumsData || !data.albumsMeta) {
      return {
        success: false,
        message: "Le fichier ne contient pas les données requises (albumsData, albumsMeta)."
      };
    }

    // Vérifier la version
    if (!data.version) {
      data.version = 1; // Ancienne version sans numéro
    }

    const stats = {
      albumsImported: 0,
      categoriesImported: 0,
      settingsImported: 0,
      albumsSkipped: 0
    };

    // Mode remplacement : vider les tables avant import
    if (mode === 'replace') {
      await db.albums.clear();
      await db.album_metas.clear();
      // Ne pas vider les catégories par défaut, seulement les personnalisées
      const defaultCategoryIds = ['cat_nc_photo', 'cat_nc_cp', 'cat_sec_nc_photo', 'cat_sec_nc_cp'];
      const customCategories = await db.categories.filter(c => !defaultCategoryIds.includes(c.id)).toArray();
      for (const cat of customCategories) {
        await db.categories.delete(cat.id);
      }
    }

    // Importer les catégories (si présentes dans la sauvegarde)
    if (data.categories && data.categories.length > 0) {
      for (const category of data.categories) {
        // Ne pas écraser les catégories par défaut
        const defaultCategoryIds = ['cat_nc_photo', 'cat_nc_cp', 'cat_sec_nc_photo', 'cat_sec_nc_cp'];
        if (defaultCategoryIds.includes(category.id)) {
          continue;
        }

        if (mode === 'merge') {
          // En mode fusion, ne pas écraser les catégories existantes
          const exists = await db.categories.get(category.id);
          if (!exists) {
            await db.categories.add(category);
            stats.categoriesImported++;
          }
        } else {
          // En mode remplacement, ajouter directement
          await db.categories.put(category);
          stats.categoriesImported++;
        }
      }
    }

    // Importer les métadonnées des albums
    for (const meta of data.albumsMeta) {
      // Ne pas importer les albums "Non classées" par défaut
      if (meta.id === 'unclassified-photoclass' || meta.id === 'unclassified-classpapiers') {
        continue;
      }

      if (mode === 'merge') {
        // En mode fusion, ne pas écraser les albums existants
        const exists = await db.album_metas.get(meta.id);
        if (exists) {
          stats.albumsSkipped++;
          continue;
        }
      }

      await db.album_metas.put(meta);
    }

    // Importer les données des albums
    for (const albumData of data.albumsData) {
      // Ne pas importer les albums "Non classées" par défaut
      if (albumData.id === 'unclassified-photoclass' || albumData.id === 'unclassified-classpapiers') {
        continue;
      }

      if (mode === 'merge') {
        // En mode fusion, ne pas écraser les albums existants
        const exists = await db.albums.get(albumData.id);
        if (exists) {
          continue; // Déjà compté dans albumsSkipped
        }
      }

      await db.albums.put(albumData);
      stats.albumsImported++;
    }

    // Importer les paramètres (si présents dans la sauvegarde)
    if (data.settings && data.settings.length > 0) {
      for (const setting of data.settings) {
        // Ne pas écraser certains paramètres sensibles en mode fusion
        if (mode === 'merge' && setting.key === 'master_code') {
          continue; // Ne pas écraser le code maître existant
        }

        await db.settings.put(setting);
        stats.settingsImported++;
      }
    }

    const modeLabel = mode === 'merge' ? 'fusionnées' : 'remplacées';
    return {
      success: true,
      message: `Données ${modeLabel} avec succès ! ${stats.albumsImported} album(s) importé(s), ${stats.categoriesImported} catégorie(s) importée(s).`,
      stats
    };

  } catch (error) {
    console.error("Import failed:", error);
    return {
      success: false,
      message: `Erreur lors de l'import : ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    };
  }
}

/**
 * Valide un fichier de sauvegarde sans l'importer
 * @param file - Le fichier JSON à valider
 * @returns Informations sur le contenu du fichier
 */
export async function validateBackupFile(file: File): Promise<{
  valid: boolean;
  message: string;
  info?: {
    version: number;
    timestamp: string;
    albumsCount: number;
    categoriesCount: number;
    settingsCount: number;
  };
}> {
  try {
    const text = await file.text();
    let data: ExportData;
    
    try {
      data = JSON.parse(text);
    } catch {
      return {
        valid: false,
        message: "Le fichier n'est pas un JSON valide."
      };
    }

    if (!data.albumsData || !data.albumsMeta) {
      return {
        valid: false,
        message: "Le fichier ne contient pas les données requises."
      };
    }

    return {
      valid: true,
      message: "Fichier valide",
      info: {
        version: data.version || 1,
        timestamp: data.timestamp || 'Inconnue',
        albumsCount: data.albumsMeta.length,
        categoriesCount: data.categories?.length || 0,
        settingsCount: data.settings?.length || 0
      }
    };

  } catch (error) {
    return {
      valid: false,
      message: `Erreur de lecture : ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    };
  }
}
