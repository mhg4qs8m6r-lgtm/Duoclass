import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mail } from 'lucide-react';
import { toast } from "sonner";
import { useLanguage } from '@/contexts/LanguageContext';

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemCount: number;
}

export default function SendModal({ isOpen, onClose, itemCount }: SendModalProps) {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Photos partagées depuis DuoClass');
  const [message, setMessage] = useState('Voici les photos que je souhaite partager avec vous.');
  const [isSending, setIsSending] = useState(false);

  const handleSend = () => {
    if (!email) {
      toast.error(language === "fr" ? "Veuillez entrer une adresse email" : "Please enter an email address");
      return;
    }
    if (!email.includes('@')) {
      toast.error("Adresse email invalide");
      return;
    }

    setIsSending(true);

    // Simulation d'envoi
    setTimeout(() => {
      setIsSending(false);
      toast.success(language === 'fr' ? `Photos envoyées avec succès à ${email}` : `Photos sent successfully to ${email}`);
      onClose();
      // Reset form
      setEmail('');
      setMessage('Voici les photos que je souhaite partager avec vous.');
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            Envoyer par email
          </DialogTitle>
          <DialogDescription>
            Partagez {itemCount} photo{itemCount > 1 ? 's' : ''} par email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Destinataire</Label>
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
            <Label htmlFor="subject">Sujet</Label>
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
          <Button onClick={handleSend} disabled={isSending} className="bg-blue-600 hover:bg-blue-700">
            {isSending ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Envoi...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Envoyer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
