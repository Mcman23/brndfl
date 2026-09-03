import nodemailer from 'nodemailer';

const createTransporter = () => {
  // If SMTP configurations are missing, return null or a mock transporter
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('SMTP settings are missing. Email notification service will run in simulated logging mode.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

export const EmailService = {
  async sendInquiryNotification(inquiry) {
    const to = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@brandfull.com';
    const from = process.env.SMTP_FROM || 'noreply@brandfull.com';

    const subject = `Yeni Layihə Müraciəti: ${inquiry.name}`;
    const text = `
Salam Admin,

Yeni bir layihə müraciəti daxil oldu:

Adı Soyadı: ${inquiry.name}
E-poçt: ${inquiry.email}
Şirkət: ${inquiry.company || '-'}
Xidmət: ${inquiry.service || 'Ümumi Əlaqə'}
Tarix: ${new Date(inquiry.createdAt).toLocaleString('az-AZ')}

Mesajı:
${inquiry.message}

İdarəetmə panelinə daxil olaraq ətraflı baxın.
`;

    const transporter = createTransporter();
    if (!transporter) {
      console.log(`[EMAIL SIMULATION] Alert to ${to} from ${from} for Inquiry ${inquiry.id}`);
      return;
    }

    try {
      await transporter.sendMail({ from, to, subject, text });
      console.log(`Email notification successfully sent for Inquiry ${inquiry.id}`);
    } catch (err) {
      console.error(`Email notification failed for Inquiry ${inquiry.id}:`, err);
    }
  },

  async sendApplicationNotification(application, jobTitle) {
    const to = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@brandfull.com';
    const from = process.env.SMTP_FROM || 'noreply@brandfull.com';

    const subject = `Yeni Vakansiya Müraciəti: ${application.name} (${jobTitle})`;
    const cvLink = `http://localhost:5000/api/admin/applications/cv-file/${application.id}`; // Secure authenticated stream link

    const text = `
Salam Admin,

Yeni iş müraciəti qəbul edildi:

Vakansiya: ${jobTitle}
Müraciət edən: ${application.name}
E-poçt: ${application.email}
Telefon: ${application.phone || '-'}
Tarix: ${new Date(application.createdAt).toLocaleString('az-AZ')}

Müşayiət məktubu:
${application.message || '-'}

CV faylı:
${application.cvUrl ? `Müraciətə baxmaq və CV yükləmək üçün inzibati panelə daxil olun. CV linki: ${cvLink}` : 'CV yüklənməyib.'}
`;

    const transporter = createTransporter();
    if (!transporter) {
      console.log(`[EMAIL SIMULATION] Alert to ${to} from ${from} for Application ${application.id}`);
      return;
    }

    try {
      await transporter.sendMail({ from, to, subject, text });
      console.log(`Email notification successfully sent for Application ${application.id}`);
    } catch (err) {
      console.error(`Email notification failed for Application ${application.id}:`, err);
    }
  }
};
