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
  const attachments = photos.map((photo) => {
    // dataUrl format: "data:image/jpeg;base64,/9j/4AAQ..."
    const matches = photo.dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) throw new Error(`Format de photo invalide: ${photo.filename}`);
    const content = matches[2];
    const contentType = matches[1];
    return {
      filename: photo.filename,
      content: Buffer.from(content, "base64"),
      contentType,
    };
  });

  await transporter.sendMail({
    from: `DuoClass <${process.env.SMTP_USER}>`,
    to,
    subject,
    text: message,
    html: `<p>${message.replace(/\n/g, "<br>")}</p>`,
    attachments,
  });
}
