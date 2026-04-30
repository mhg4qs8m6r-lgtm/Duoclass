import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mail } from 'lucide-react';
import { toast } from "sonner";
import { useLanguage } from '@/contexts/LanguageContext';

interface PhotoToSend {
  filename: string;
  dataUrl: string;
}

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: PhotoToSend[];
}

export default function SendModal({ isOpen, onClose, photos }: SendModalProps) {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Photos partagées depuis DuoClass');
  const [message, setMessage] = useState('Voici les photos que je souhaite partager avec vous.');
  const [sending, setSending] = useState(false);

  const itemCount = photos.length;

  const handleSend = async () => {
    if (!email) {
      toast.error(language === "fr" ? "Veuillez entrer une adresse email" : "Please enter an email address");
      return;
    }
    if (!email.includes('@')) {
      toast.error(language === "fr" ? "Adresse email invalide" : "Invalid email address");
      return;
    }
    setSending(true);
    // Envoi SMTP non disponible en mode Electron local.
    toast.info(language === 'fr'
      ? "L'envoi par email n'est pas disponible en mode local."
      : "Email sending is not available in local mode.");
    setSending(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            {language === 'fr' ? 'Envoyer par email' : 'Send by email'}
          </DialogTitle>
          <DialogDescription>
            {language === 'fr'
              ? `Partagez ${itemCount} photo${itemCount > 1 ? 's' : ''} par email`
              : `Share ${itemCount} photo${itemCount > 1 ? 's' : ''} by email`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Aperçu des photos */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {photos.map((photo, i) => (
              <img
                key={i}
                src={photo.dataUrl}
                alt={photo.filename}
                className="h-16 w-16 rounded-md object-cover border border-gray-200 flex-shrink-0"
              />
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{language === 'fr' ? 'Destinataire' : 'Recipient'}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                placeholder="exemple@email.com"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">{language === 'fr' ? 'Sujet' : 'Subject'}</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{language === 'fr' ? 'Annuler' : 'Cancel'}</Button>
          <Button onClick={handleSend} disabled={sending} className="bg-blue-600 hover:bg-blue-700">
            <Send className="w-4 h-4 mr-2" />
            {language === 'fr' ? 'Envoyer' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
