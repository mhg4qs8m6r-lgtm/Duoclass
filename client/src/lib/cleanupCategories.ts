import { db } from '../db';

// IDs des catégories NON CLASSEE (les seules qui doivent être conservées comme défaut)
const NON_CLASSEE_CATEGORY_IDS = new Set([
  'cat_nc_photos',      // Photos & Vidéos standard
  'cat_nc_docs',        // Documents standard
  'cat_sec_nc_photos',  // Photos & Vidéos sécurisé
  'cat_sec_nc_docs'     // Documents sécurisé
]);

// Anciens IDs à migrer vers les nouveaux
const OLD_TO_NEW_CATEGORY_MAP: Record<string, string> = {
  'cat_nc_photo': 'cat_nc_photos',
  'cat_nc_cp': 'cat_nc_docs',
  'cat_sec_nc_photo': 'cat_sec_nc_photos',
  'cat_sec_nc_cp': 'cat_sec_nc_docs'
};

/**
 * Clean up unnecessary default categories from the database
 * Keeps only NON CLASSEE categories and user-created categories
 */
export async function cleanupUnnecessaryCategories() {
  try {
    const allCategories = await db.categories.toArray();
    console.log('Total categories before cleanup:', allCategories.length);
    
    // Supprimer les catégories par défaut qui ne sont pas NON CLASSEE
    // Les catégories créées par l'utilisateur (isDefault: false ou undefined) sont conservées
    const categoriesToDelete = allCategories.filter(cat => 
      cat.isDefault === true && !NON_CLASSEE_CATEGORY_IDS.has(cat.id)
    );
    
    console.log('Categories to delete:', categoriesToDelete.length);
    console.log('Deleted categories:', categoriesToDelete.map(c => ({ id: c.id, label: c.label })));
    
    // Delete unnecessary categories
    for (const cat of categoriesToDelete) {
      // Réassigner les albums de cette catégorie vers NON CLASSEE
      const albumsInCategory = await db.album_metas.where('categoryId').equals(cat.id).toArray();
      for (const album of albumsInCategory) {
        // Déterminer la catégorie NON CLASSEE appropriée
        let newCategoryId = 'cat_nc_photos';
        if (album.series === 'classpapiers') {
          newCategoryId = album.type === 'secure' ? 'cat_sec_nc_docs' : 'cat_nc_docs';
        } else {
          newCategoryId = album.type === 'secure' ? 'cat_sec_nc_photos' : 'cat_nc_photos';
        }
        await db.album_metas.update(album.id, { categoryId: newCategoryId });
      }
      
      // Delete the category itself
      await db.categories.delete(cat.id);
    }
    
    const remainingCategories = await db.categories.toArray();
    console.log('Total categories after cleanup:', remainingCategories.length);
    console.log('Cleanup complete!');
    
    return {
      success: true,
      deletedCount: categoriesToDelete.length,
      remainingCount: remainingCategories.length
    };
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}

/**
 * Nettoyage au démarrage : 
 * - Migre les albums des anciennes catégories vers les nouvelles
 * - Supprime les anciennes catégories NON CLASSEE obsolètes
 * - CONSERVE les catégories créées par l'utilisateur (isDefault: false)
 */
export async function cleanupAllExceptNonClassee() {
  try {
    const allCategories = await db.categories.toArray();
    console.log('=== NETTOYAGE DES CATÉGORIES AU DÉMARRAGE ===');
    console.log('Total categories before cleanup:', allCategories.length);
    
    // Migrer les albums des anciennes catégories vers les nouvelles
    const allAlbums = await db.album_metas.toArray();
    for (const album of allAlbums) {
      // Vérifier si l'album utilise une ancienne catégorie NON CLASSEE
      if (album.categoryId && OLD_TO_NEW_CATEGORY_MAP[album.categoryId]) {
        const newCategoryId = OLD_TO_NEW_CATEGORY_MAP[album.categoryId];
        await db.album_metas.update(album.id, { categoryId: newCategoryId });
        console.log(`Album ${album.id} migré de ${album.categoryId} vers ${newCategoryId}`);
      }
      // NE PAS réassigner les albums des catégories utilisateur vers NON CLASSEE
    }
    
    // Supprimer UNIQUEMENT les anciennes catégories NON CLASSEE obsolètes
    for (const oldId of Object.keys(OLD_TO_NEW_CATEGORY_MAP)) {
      const exists = await db.categories.get(oldId);
      if (exists) {
        await db.categories.delete(oldId);
        console.log(`Ancienne catégorie supprimée: ${oldId}`);
      }
    }
    
    const remainingCategories = await db.categories.toArray();
    console.log('Total categories after cleanup:', remainingCategories.length);
    console.log('Remaining:', remainingCategories.map(c => ({ id: c.id, label: c.label, isDefault: c.isDefault })));
    
    return {
      success: true,
      remainingCount: remainingCategories.length
    };
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}
