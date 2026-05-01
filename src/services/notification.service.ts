import axios from 'axios';

export class NotificationService {
  /**
   * Dispara um alerta para o Discord da Tesouraria/Admin
   */
  static async sendDiscordAlert(title: string, message: string, color: number = 0x00FF00) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return; // Ignora se não estiver configurado no .env

    try {
      await axios.post(webhookUrl, {
        embeds: [{
          title: title,
          description: message,
          color: color,
          timestamp: new Date().toISOString(),
          footer: { text: 'Atlas Core Banking Engine' }
        }]
      });
    } catch (error) {
      console.error('[ATLAS ALERTS] Falha ao enviar para o Discord:', error);
    }
  }

  /**
   * Stub para o envio de Emails via Resend (a implementar depois)
   */
  static async sendEmail(to: string, subject: string, html: string) {
    // Integração Resend entrará aqui
    console.log(`[EMAIL DISPATCH] Para: ${to} | Assunto: ${subject}`);
  }
}
