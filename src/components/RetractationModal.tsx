import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface RetractationModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  subscriptionPrice: number;
  subscriptionName: string;
}

export function RetractationModal({
  open,
  onConfirm,
  onCancel,
  subscriptionPrice,
  subscriptionName,
}: RetractationModalProps) {
  const [understood, setUnderstood] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleConfirm = () => {
    if (understood && acknowledged) {
      onConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-red-600">
            ⚠️ DROIT DE RÉTRACTATION - À LIRE ATTENTIVEMENT
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            Avant de confirmer votre achat, veuillez lire et accepter les conditions de rétractation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Section 1: Droit de rétractation */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h3 className="font-bold text-lg text-blue-900 mb-2">📋 Vous avez un droit de rétractation</h3>
            <p className="text-sm text-blue-800">
              Conformément à la loi française et européenne (Directive 2011/83/UE), vous disposez d'un droit de 
              <span className="font-bold text-base"> rétractation de 14 jours calendaires</span> à compter de la date d'achat.
            </p>
          </div>

          {/* Section 2: Conditions */}
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <h3 className="font-bold text-lg text-red-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              CONDITION ESSENTIELLE
            </h3>
            <div className="bg-white p-3 rounded border-2 border-red-300 mb-3">
              <p className="text-sm font-bold text-red-700">
                Vous pouvez vous rétracter UNIQUEMENT si vous n'avez effectué AUCUNE ACTION sur l'application.
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-semibold text-red-900">❌ Les actions qui vous privent du droit de rétractation :</p>
              <ul className="list-disc list-inside space-y-1 text-red-800 ml-2">
                <li>Importer une photo ou un document</li>
                <li>Retoucher une image</li>
                <li>Créer un album ou une catégorie</li>
                <li>Créer une création/composition</li>
                <li>Exporter ou télécharger des fichiers</li>
                <li>Partager des contenus</li>
                <li>Utiliser les outils de conversion ou d'impression</li>
              </ul>

              <p className="font-semibold text-green-900 mt-3">✅ Consulter les pages = PAS une action</p>
              <p className="text-green-800">
                Vous pouvez explorer l'interface, lire le guide, consulter les pages sans perdre votre droit de rétractation.
              </p>
            </div>
          </div>

          {/* Section 3: Remboursement */}
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <h3 className="font-bold text-lg text-green-900 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Remboursement
            </h3>
            <div className="space-y-2 text-sm text-green-800">
              <p><span className="font-bold">Montant remboursé :</span> 100% du montant payé ({subscriptionPrice}€)</p>
              <p><span className="font-bold">Délai :</span> 14 jours après validation de votre demande</p>
              <p><span className="font-bold">Frais :</span> Aucun frais ne vous sera facturé</p>
            </div>
          </div>

          {/* Section 4: Vérification automatique */}
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
            <h3 className="font-bold text-lg text-yellow-900 mb-2">🔍 Vérification automatique</h3>
            <p className="text-sm text-yellow-800">
              Lors de votre demande de rétractation, nous vérifierons automatiquement vos logs d'activité. 
              Si aucune action n'est détectée, votre rétractation sera approuvée immédiatement.
            </p>
          </div>

          {/* Section 5: Comment se rétracter */}
          <div className="bg-gray-50 border-l-4 border-gray-500 p-4 rounded">
            <h3 className="font-bold text-lg text-gray-900 mb-2">📞 Comment exercer votre droit ?</h3>
            <p className="text-sm text-gray-800 mb-2">
              Vous pouvez vous rétracter via :
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-800 ml-2">
              <li>Le formulaire de rétractation dans l'application (Paramètres → Rétractation)</li>
              <li>Un email à <span className="font-bold">support@duoclass.com</span></li>
            </ul>
          </div>

          {/* Checkboxes de validation */}
          <div className="space-y-3 bg-gray-100 p-4 rounded">
            <div className="flex items-start gap-3">
              <Checkbox
                id="understood"
                checked={understood}
                onCheckedChange={(checked) => setUnderstood(checked as boolean)}
                className="mt-1"
              />
              <label
                htmlFor="understood"
                className="text-sm font-semibold cursor-pointer leading-relaxed"
              >
                ✅ <span className="text-red-600">J'ai lu et compris</span> que je peux me rétracter uniquement si je 
                n'ai effectué aucune action (consultation de pages = OK).
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="acknowledged"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
                className="mt-1"
              />
              <label
                htmlFor="acknowledged"
                className="text-sm font-semibold cursor-pointer leading-relaxed"
              >
                ✅ <span className="text-red-600">J'accepte les conditions</span> et je confirme que j'ai pris connaissance 
                de mon droit de rétractation avant d'effectuer cet achat.
              </label>
            </div>
          </div>

          {/* Avertissement final */}
          <div className="bg-red-100 border border-red-400 p-3 rounded text-sm text-red-800">
            <p className="font-bold mb-1">⚠️ Attention :</p>
            <p>
              En cochant ces cases, vous reconnaissez avoir lu et accepté les conditions de rétractation. 
              Toute demande de rétractation après avoir effectué une action sera refusée.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
            className="px-6"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!understood || !acknowledged}
            className={`px-6 ${
              understood && acknowledged
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            Je confirme et j'achète ({subscriptionPrice}€)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
