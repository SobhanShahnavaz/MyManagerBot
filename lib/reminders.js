import { db, api } from 'sdk';
import { today, tomorrow, formatYYYYMMDD } from 'lib/dates';
import { escapeHtml, formatMoney } from 'lib/utils';

// ─────────────────────────────────────────────
// Reminder Logic
// ─────────────────────────────────────────────
export async function checkDueReminders() {
  const todayDate = today();
  const tomorrowDate = tomorrow(todayDate);
  const tomorrowStr = formatYYYYMMDD(tomorrowDate);

  const activeCustomers = await db.all(
    `
    SELECT *
    FROM customers
    WHERE status = 'ACTIVE'
      AND due_date <= :tomorrow
    ORDER BY due_date ASC
    `,
    {
      ':tomorrow': tomorrowStr,
    }
  );

  const reminders = [];

  for (const customer of activeCustomers) {
    const lastReminder = await getLastReminder(
      customer.customer_id
    );

    if (lastReminder) {
      continue;
    }

    reminders.push(customer);
  }

  return reminders;
}

export async function markReminderSent(customerId) {
  await db.run(
    `
    INSERT INTO settings (key, value)
    VALUES (:key, '1')
    ON CONFLICT(key) DO UPDATE SET value = '1'
    `,
    {
      ':key': `reminder:${customerId}`,
    }
  );
}

export async function clearReminderSent(customerId) {
  await db.run(
    `
    DELETE FROM settings
    WHERE key = :key
    `,
    {
      ':key': `reminder:${customerId}`,
    }
  );
}

export async function getLastReminder(customerId) {
  return await db.get(
    `
    SELECT value
    FROM settings
    WHERE key = :key
    LIMIT 1
    `,
    {
      ':key': `reminder:${customerId}`,
    }
  );
}

export async function sendDueReminders(chatId) {
  const dueCustomers = await checkDueReminders();
  const sent = [];

  for (const customer of dueCustomers) {
    const text =
      `⏰ <b>Renewal Reminder</b>\n\n` +
      `🆔 Customer ID: <b>${escapeHtml(customer.customer_id)}</b>\n` +
      `👤 Name: <b>${escapeHtml(customer.name)}</b>\n` +
      `🤖 Bot: <b>${escapeHtml(customer.botname)}</b>\n` +
      `📅 Due Date: <b>${escapeHtml(customer.due_date)}</b>\n` +
      `💵 Monthly Price: <b>${formatMoney(customer.monthly_price)}</b>`;

    await api.sendMessage({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });

    await markReminderSent(customer.customer_id);
    sent.push(customer);
  }

  return sent;
}

// Telegram Serverless entry point for running reminders on demand or scheduled platform execution
export default async function (input, ctx) {
  const chatId = input?.chatId || ctx?.update?.message?.chat?.id;
  if (!chatId) {
    console.log('Reminder check run: no chatId target provided.');
    const due = await checkDueReminders();
    return { success: true, count: due.length, dueCustomers: due };
  }

  const sent = await sendDueReminders(chatId);
  return { success: true, count: sent.length, sent };
}