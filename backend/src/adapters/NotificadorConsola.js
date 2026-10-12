// Único canal de notificación por ahora. Si aparecen email, push o SMS, se
// reevalúa usar Factory Method para elegir el canal.
class NotificadorConsola {
  enviar({ destinatario, mensaje }) {
    console.log(`[aviso a ${destinatario}] ${mensaje}`);
  }
}

module.exports = NotificadorConsola;