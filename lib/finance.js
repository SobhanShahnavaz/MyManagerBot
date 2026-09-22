import { db, api } from 'sdk';
import { escapeHtml, formatMoney } from 'lib/utils';

// ─────────────────────────────────────────────
// Database
// ─────────────────────────────────────────────
export async function getCustomer(customerId) {
  return await db.get(
    `
    SELECT *
    FROM customers
    WHERE customer_id = :customer_id
    LIMIT 1
    `,
    {
      ':customer_id': customerId,
    }
  );
}

export async function addPayment(data) {
  await db.run(
    `
    INSERT INTO payments (
      customer_id,
      amount,
      type,
      description
    )
    VALUES (
      :customer_id,
      :amount,
      :type,
      :description
    )
    `,
    {
      ':customer_id': data.customer_id,
      ':amount': data.amount,
      ':type': data.type,
      ':description': data.description || '',
    }
  );

  return await getPayment(data.customer_id, data.amount, data.type);
}

export async function getPayment(customerId, amount, type) {
  return await db.get(
    `
    SELECT *
    FROM payments
    WHERE customer_id = :customer_id
      AND amount = :amount
      AND type = :type
    ORDER BY id DESC
    LIMIT 1
    `,
    {
      ':customer_id': customerId,
      ':amount': amount,
      ':type': type,
    }
  );
}

export async function addExpense(data) {
  await db.run(
    `
    INSERT INTO expenses (
      amount,
      description
    )
    VALUES (
      :amount,
      :description
    )
    `,
    {
      ':amount': data.amount,
      ':description': data.description || '',
    }
  );

  return await getExpense(data.amount, data.description);
}

export async function getExpense(amount, description) {
  return await db.get(
    `
    SELECT *
    FROM expenses
    WHERE amount = :amount
      AND description = :description
    ORDER BY id DESC
    LIMIT 1
    `,
    {
      ':amount': amount,
      ':description': description || '',
    }
  );
}

// ─────────────────────────────────────────────
// Finance Reports
// ─────────────────────────────────────────────
export async function getFinanceSummary() {
  const income = await db.get(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM payments`
  );

  const expenses = await db.get(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses`
  );

  const renewals = await db.get(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE type = 'renew'`
  );

  const others = await db.get(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE type = 'others'`
  );

  return {
    income: Number(income?.total || 0),
    expenses: Number(expenses?.total || 0),
    renewals: Number(renewals?.total || 0),
    others: Number(others?.total || 0),
    profit:
      Number(income?.total || 0) - Number(expenses?.total || 0),
  };
}

export async function getFinanceSummaryForRange(startDate, endDate) {
  const income = await db.get(
    `
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM payments
    WHERE payment_date >= :start_date
      AND payment_date < :end_date
    `,
    {
      ':start_date': startDate,
      ':end_date': endDate,
    }
  );

  const expenses = await db.get(
    `
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE expense_date >= :start_date
      AND expense_date < :end_date
    `,
    {
      ':start_date': startDate,
      ':end_date': endDate,
    }
  );

  const renewals = await db.get(
    `
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM payments
    WHERE type = 'renew'
      AND payment_date >= :start_date
      AND payment_date < :end_date
    `,
    {
      ':start_date': startDate,
      ':end_date': endDate,
    }
  );

  const others = await db.get(
    `
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM payments
    WHERE type = 'others'
      AND payment_date >= :start_date
      AND payment_date < :end_date
    `,
    {
      ':start_date': startDate,
      ':end_date': endDate,
    }
  );

  return {
    income: Number(income?.total || 0),
    expenses: Number(expenses?.total || 0),
    renewals: Number(renewals?.total || 0),
    others: Number(others?.total || 0),
    profit:
      Number(income?.total || 0) - Number(expenses?.total || 0),
  };
}

// ─────────────────────────────────────────────
// User-facing
// ─────────────────────────────────────────────
export async function showPaymentConfirmation(chatId, payment) {
  await api.sendMessage({
    chat_id: chatId,
    text:
      `✅ <b>Payment Added</b>\n\n` +
      `🆔 Customer ID: <b>${escapeHtml(payment.customer_id)}</b>\n` +
      `💵 Amount: <b>${formatMoney(payment.amount)}</b>\n` +
      `📊 Type: <b>${escapeHtml(payment.type)}</b>\n` +
      `📝 Description: ${escapeHtml(payment.description || '-')}`,
    parse_mode: 'HTML',
  });
}

export async function showExpenseConfirmation(chatId, expense) {
  await api.sendMessage({
    chat_id: chatId,
    text:
      `✅ <b>Expense Added</b>\n\n` +
      `💵 Amount: <b>${formatMoney(expense.amount)}</b>\n` +
      `📝 Description: ${escapeHtml(expense.description || '-')}`,
    parse_mode: 'HTML',
  });
}

export async function showFinanceReport(chatId, label, summary) {
  await api.sendMessage({
    chat_id: chatId,
    text:
      `📊 <b>Finance Report: ${escapeHtml(label)}</b>\n\n` +
      `💰 <b>Income</b>: <b>${formatMoney(summary.income)}</b>\n` +
      `💸 <b>Expenses</b>: <b>${formatMoney(summary.expenses)}</b>\n` +
      `📈 <b>Profit</b>: <b>${formatMoney(summary.profit)}</b>\n\n` +
      `🔄 Renewals: <b>${formatMoney(summary.renewals)}</b>\n` +
      `➕ Others: <b>${formatMoney(summary.others)}</b>`,
    parse_mode: 'HTML',
  });
}
