import { db } from 'sdk';
import { today, tomorrow, formatYYYYMMDD } from './dates.js';

// ─────────────────────────────────────────────
// Reminder Logic
// ─────────────────────────────────────────────
export async function checkDueReminders() {
  const todayDate = today();
  const todayStr = formatYYYYMMDD(todayDate);
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