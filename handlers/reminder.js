import { db } from 'sdk';
import { sendDueReminders, checkDueReminders } from 'lib/reminders';

// Retrieve stored admin chatId from settings table
export async function getDefaultAdminChatId() {
  const row = await db.get(
    `
    SELECT value
    FROM settings
    WHERE key = 'admin_chat_id'
    LIMIT 1
    `
  );
  return row?.value ? Number(row.value) : null;
}

// Handler entry point invoked by platform cron / scheduled event or CLI
export default async function (payload, ctx) {
  let chatId = payload?.chatId || ctx?.update?.message?.chat?.id;

  if (!chatId) {
    chatId = await getDefaultAdminChatId();
  }

  if (!chatId) {
    console.log('[Reminder Cron] No target admin chatId found in settings.');
    const due = await checkDueReminders();
    return {
      success: false,
      reason: 'NO_ADMIN_CHAT_ID',
      dueCount: due.length,
      dueCustomers: due,
    };
  }

  console.log(`[Reminder Cron] Executing daily reminder check for chatId: ${chatId}`);
  const sent = await sendDueReminders(chatId);
  return {
    success: true,
    sentCount: sent.length,
    sent,
  };
}
