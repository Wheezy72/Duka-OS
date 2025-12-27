/**
 * WhatsAppService sends simple text notifications to the shop owner using
 * WhatsApp Cloud API.
 *
 * This is intentionally minimal: we only send short, human-readable messages.
 */
export class WhatsAppService {
  private readonly accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
  private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  private readonly ownerNumber = process.env.WHATSAPP_OWNER_NUMBER || "";

  private get apiUrl(): string {
    return `https://graph.facebook.com/v17.0/${this.phoneNumberId}/messages`;
  }

  private ensureConfigured() {
    if (!this.accessToken || !this.phoneNumberId || !this.ownerNumber) {
      throw new Error(
        "WhatsApp configuration missing. Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_OWNER_NUMBER."
      );
    }
  }

  async sendOwnerMessage(message: string): Promise<void> {
    this.ensureConfigured();

    const body = {
      messaging_product: "whatsapp",
      to: this.ownerNumber,
      type: "text",
      text: {
        preview_url: false,
        body: message,
      },
    };

    const res = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("WhatsApp sendOwnerMessage failed:", res.status, text);
      throw new Error("Failed to send WhatsApp message to owner.");
    }
  }
}