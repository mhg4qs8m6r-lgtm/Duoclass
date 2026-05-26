import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true, // port 465 = SSL
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendPhotosEmailOptions {
  to: string;
  subject: string;
  message: string;
  photos: { filename: string; dataUrl: string }[];
}

export async function sendPhotosEmail({ to, subject, message, photos }: SendPhotosEmailOptions) {
  const attachments = await Promise.all(photos.map(async (photo) => {
    let content: Buffer;
    let contentType: string;

    if (photo.dataUrl.startsWith("data:")) {
      // data URL base64 (legacy ou PDF converti)
      const matches = photo.dataUrl.match(/^data:(.+);base64,(.+)$/);
      if (!matches) throw new Error(`Format de photo invalide: ${photo.filename}`);
      content = Buffer.from(matches[2], "base64");
      contentType = matches[1];
    } else {
      // URL S3 — fetch côté serveur
      const response = await fetch(photo.dataUrl);
      if (!response.ok) throw new Error(`Impossible de télécharger la photo: ${photo.filename}`);
      content = Buffer.from(await response.arrayBuffer());
      contentType = response.headers.get("content-type") || "image/jpeg";
    }

    return { filename: photo.filename, content, contentType };
  }));

  await transporter.sendMail({
    from: `DuoClass <${process.env.SMTP_USER}>`,
    to,
    subject,
    text: message,
    html: `<p>${message.replace(/\n/g, "<br>")}</p>`,
    attachments,
  });
}
