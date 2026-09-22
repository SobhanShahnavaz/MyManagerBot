import { db, api } from 'sdk';
import { today, tomorrow, weekFrom, firstDayOfMonth, formatYYYYMMDD } from 'lib/dates';
import { escapeHtml, formatMoney } from 'lib/utils';

export async function showDashboard(chatId, messageId) {
  const todayDate = today();
  const tomorrowDate = tomorrow(todayDate);
  const weekEndDate = weekFrom(todayDate);
  const firstDay = firstDayOfMonth(todayDate);

  const todayStr = formatYYYYMMDD(todayDate);
  const tomorrowStr = formatYYYYMMDD(tomorrowDate);
  const weekEndStr = formatYYYYMMDD(weekEndDate);
  const firstDayStr = formatYYYYMMDD(firstDay);

  // Customers
  const totalCustomers = await db.get(
    `SELECT COUNT(*) AS count FROM customers`
  );

  const activeCustomers = await db.get(
    `SELECT COUNT(*) AS count FROM customers WHERE status = 'ACTIVE'`
  );

  const expiredCustomers = await db.get(
    `SELECT COUNT(*) AS count FROM customers WHERE status = 'EXPIRED'`
  );

  // Finance
  const income = await db.get(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM payments`
  );

  const expenses = await db.get(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses`
  );

  const profit =
    Number(income?.total || 0) -
    Number(expenses?.total || 0);

  // Upcoming
  const dueTomorrow = await db.get(
    `
    SELECT COUNT(*) AS count
    FROM customers
    WHERE status = 'ACTIVE'
    AND due_date = :tomorrow
    `,
    {
      ':tomorrow': tomorrowStr,
    }
  );

  const dueWeek = await db.get(
    `
    SELECT COUNT(*) AS count
    FROM customers
    WHERE status = 'ACTIVE'
    AND due_date >= :today
    AND due_date <= :weekEnd
    `,
    {
      ':today': todayStr,
      ':weekEnd': weekEndStr,
    }
  );

  // Monthly finance
  const renewals = await db.get(
    `
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM payments
    WHERE type = 'renew'
    AND payment_date >= :firstDay
    `,
    {
      ':firstDay': firstDayStr,
    }
  );

  const extraPayments = await db.get(
    `
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM payments
    WHERE type = 'others'
    AND payment_date >= :firstDay
    `,
    {
      ':firstDay': firstDayStr,
    }
  );

  const monthlyExpenses = await db.get(
    `
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE expense_date >= :firstDay
    `,
    {
      ':firstDay': firstDayStr,
    }
  );

  const text = `
📊 <b>Dashboard</b>

👥 <b>Customers</b>
━━━━━━━━━━━━━━

Total Customers : <b>${totalCustomers?.count || 0}</b>
Active          : <b>${activeCustomers?.count || 0}</b>
Expired         : <b>${expiredCustomers?.count || 0}</b>

━━━━━━━━━━━━━━

💰 <b>Finance</b>

Income          : <b>${formatMoney(income?.total)}</b>
Expenses        : <b>${formatMoney(expenses?.total)}</b>
Profit          : <b>${formatMoney(profit)}</b>

━━━━━━━━━━━━━━

📅 <b>Upcoming</b>

Expire Tomorrow : <b>${dueTomorrow?.count || 0}</b>
Expire This Week: <b>${dueWeek?.count || 0}</b>

━━━━━━━━━━━━━━

💸 <b>Monthly</b>

Renewals        : <b>${formatMoney(renewals?.total)}</b>
Extra Payments  : <b>${formatMoney(extraPayments?.total)}</b>
Expenses        : <b>${formatMoney(monthlyExpenses?.total)}</b>
`;

  const params = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '⬅️ Back',
            callback_data: 'back_main',
          },
        ],
      ],
    },
  };

  if (messageId) {
    params.message_id = messageId;
    await api.editMessageText(params);
  } else {
    await api.sendMessage(params);
  }
}
