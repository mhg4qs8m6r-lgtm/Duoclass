import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Retractation() {
  const { language } = useLanguage();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    purchaseDate: '',
    reason: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation basique
      if (!formData.fullName || !formData.email || !formData.purchaseDate) {
        toast.error(language === 'fr' ? 'Veuillez remplir tous les champs obligatoires' : 'Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Vérifier que la date est dans les 14 jours
      const purchaseDate = new Date(formData.purchaseDate);
      const today = new Date();
      const daysDifference = Math.floor(
        (today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDifference > 14) {
        toast.error(
          'Délai de rétractation dépassé. Vous devez vous rétracter dans les 14 jours.'
        );
        setLoading(false);
        return;
      }

      // Simuler l'envoi du formulaire
      // En production, cela appellerait une API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Afficher le message de succès
      setSubmitted(true);
      toast.success(language === 'fr' ? 'Votre demande de rétractation a été envoyée avec succès' : 'Your retraction request has been sent successfully');

      // Réinitialiser le formulaire après 3 secondes
      setTimeout(() => {
        setFormData({
          fullName: '',
          email: '',
          purchaseDate: '',
          reason: '',
        });
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      toast.error(language === 'fr' ? 'Une erreur est survenue. Veuillez réessayer.' : 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <CardTitle className="text-2xl text-green-900">
                ✅ Demande envoyée avec succès
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-green-800">
                Votre demande de rétractation a été reçue et sera traitée dans les meilleurs délais.
              </p>
              <p className="text-green-700 font-semibold">
                Vous recevrez une confirmation par email à l'adresse : <br />
                <span className="text-green-900">{formData.email}</span>
              </p>
              <div className="bg-white p-4 rounded border border-green-200 mt-4">
                <p className="text-sm text-gray-600">
                  <strong>Délai de traitement :</strong> 3 à 5 jours ouvrables
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  <strong>Remboursement :</strong> 14 jours après approbation
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-red-600">
            Formulaire de Rétractation
          </h1>
          <p className="text-gray-600">
            Exercez votre droit de rétractation dans les 14 jours suivant votre achat
          </p>
        </div>

        {/* Information importante */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertCircle className="w-5 h-5" />
              ⚠️ Conditions de rétractation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-red-800">
            <p>
              <strong>Vous pouvez vous rétracter uniquement si :</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Vous n'avez effectué AUCUNE action sur l'application</li>
              <li>Vous n'avez importé aucune photo ou document</li>
              <li>Vous n'avez créé aucun album ou composition</li>
              <li>Vous n'avez utilisé aucun outil de retouche ou conversion</li>
            </ul>
            <p className="mt-3">
              <strong>Consulter les pages et lire le guide = PAS une action</strong>
            </p>
          </CardContent>
        </Card>

        {/* Formulaire */}
        <Card>
          <CardHeader>
            <CardTitle>Votre demande de rétractation</CardTitle>
            <CardDescription>
              Tous les champs marqués d'un * sont obligatoires
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nom complet */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="font-semibold">
                  Nom complet *
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Votre nom et prénom"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="border-gray-300"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold">
                  Adresse email *
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="votre.email@exemple.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="border-gray-300"
                />
                <p className="text-xs text-gray-500">
                  L'adresse email associée à votre compte DuoClass
                </p>
              </div>

              {/* Date d'achat */}
              <div className="space-y-2">
                <Label htmlFor="purchaseDate" className="font-semibold">
                  Date d'achat de l'abonnement *
                </Label>
                <Input
                  id="purchaseDate"
                  name="purchaseDate"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  required
                  className="border-gray-300"
                />
                <p className="text-xs text-gray-500">
                  Vous devez vous rétracter dans les 14 jours suivant cette date
                </p>
              </div>

              {/* Raison (optionnel) */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="font-semibold">
                  Raison de la rétractation (optionnel)
                </Label>
                <Textarea
                  id="reason"
                  name="reason"
                  placeholder="Expliquez brièvement pourquoi vous souhaitez vous rétracter..."
                  value={formData.reason}
                  onChange={handleChange}
                  className="border-gray-300 min-h-[120px]"
                />
              </div>

              {/* Confirmation */}
              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>📧 Confirmation :</strong> Vous recevrez une confirmation par email à l'adresse fournie.
                  Notre équipe examinera votre demande et vous contactera si des informations supplémentaires
                  sont nécessaires.
                </p>
              </div>

              {/* Boutons */}
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setFormData({
                      fullName: '',
                      email: '',
                      purchaseDate: '',
                      reason: '',
                    })
                  }
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {loading ? 'Envoi en cours...' : 'Envoyer ma demande'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Contacts alternatifs */}
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-lg">Autres moyens de nous contacter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">Email</p>
                <p className="text-gray-600">support@duoclass.com</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">Support</p>
                <p className="text-gray-600">Disponible du lundi au vendredi, 9h-18h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lien vers les CGU */}
        <div className="text-center text-sm text-gray-600">
          <p>
            Pour plus d'informations, consultez nos{' '}
            <a href="/cgu" className="text-blue-600 hover:underline font-semibold">
              Conditions Générales d'Utilisation
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
