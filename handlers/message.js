import { api, db } from 'sdk';

import {
  getState,
  setState,
  clearState,
  parseStateData,
} from 'lib/state';

import {
  addCustomer,
  searchCustomer,
  showEditCustomer,
  renewCustomer,
  deleteCustomer,
  updateCustomer,
  getLogsByCustomer,
} from 'lib/customers';

import {
  addPayment,
  addExpense,
} from 'lib/finance';

import {
  escapeHtml,
  formatMoney,
  isValidDate,
} from 'lib/utils';

// ─────────────────────────────────────────────
// Admin Configuration
// ─────────────────────────────────────────────
const ADMIN_IDS = [
  // Put your Telegram admin IDs here.
  // Example: 123456789, 987654321
];

function isAdmin(userId) {
  if (!userId) return false;
  if (ADMIN_IDS.length === 0) return true;
  return ADMIN_IDS.includes(Number(userId));
}

// ─────────────────────────────────────────────
// Menus
// ─────────────────────────────────────────────
function mainMenu() {
  return {
    inline_keyboard: [
      [
        {
          text: '🗂 Dashboard',
          callback_data: 'dashboard',
        },
      ],
      [
        {
          text: '👥 Customers',
          callback_data: 'customers',
        },
      ],
      [
        {
          text: '💰 Finance',
          callback_data: 'finance',
        },
      ],
      [
        {
          text: '⚙️ Settings',
          callback_data: 'settings',
        },
      ],
    ],
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function getUserId(message) {
  return message.from?.id;
}

async function sendError(chatId, text) {
  await api.sendMessage({
    chat_id: chatId,
    text: `❌ ${text}`,
  });
}

function isCommand(text) {
  return typeof text === 'string' && text.startsWith('/');
}

async function handleAccessDenied(chatId) {
  await api.sendMessage({
    chat_id: chatId,
    text: '⛔ Access denied.',
  });
}

// ─────────────────────────────────────────────
// /start
// ─────────────────────────────────────────────
async function handleStart(message) {
  const userId = getUserId(message);
  await clearState(userId);

  await api.sendMessage({
    chat_id: message.chat.id,
    text: "Hello Boss. I'm Ready For any Task.",
    reply_markup: mainMenu(),
  });
}

// ─────────────────────────────────────────────
// Add Customer
// ─────────────────────────────────────────────
async function handleAddCustomer(message, state, data, text) {
  const chatId = message.chat.id;

  switch (state.state) {
    case 'customer_add_customer_id': {
      const customerId = Number(text);

      if (!Number.isInteger(customerId)) {
        await sendError(chatId, 'Customer ID must be a number.');
        return;
      }

      const existing = await searchCustomerSilently(customerId);

      if (existing) {
        await sendError(
          chatId,
          'A customer with this ID already exists.'
        );
        return;
      }

      data.customer_id = customerId;
      await setState(getUserId(message), 'customer_add_botname', data);

      await api.sendMessage({
        chat_id: chatId,
        text: 'Send bot name:',
      });
      return;
    }

    case 'customer_add_botname': {
      data.botname = text;
      await setState(getUserId(message), 'customer_add_due_date', data);

      await api.sendMessage({
        chat_id: chatId,
        text: 'Send due date (YYYY-MM-DD):',
      });
      return;
    }

    case 'customer_add_due_date': {
      if (!isValidDate(text)) {
        await sendError(chatId, 'Invalid date. Use YYYY-MM-DD.');
        return;
      }

      data.due_date = text;
      await setState(getUserId(message), 'customer_add_name', data);

      await api.sendMessage({
        chat_id: chatId,
        text: 'Send customer name:',
      });
      return;
    }

    case 'customer_add_name': {
      data.name = text;
      await setState(getUserId(message), 'customer_add_register_date', data);

      await api.sendMessage({
        chat_id: chatId,
        text: 'Send register date (YYYY-MM-DD):',
      });
      return;
    }

    case 'customer_add_register_date': {
      if (!isValidDate(text)) {
        await sendError(chatId, 'Invalid date. Use YYYY-MM-DD.');
        return;
      }

      data.register_date = text;
      await setState(getUserId(message), 'customer_add_monthly_price', data);

      await api.sendMessage({
        chat_id: chatId,
        text: 'Send monthly price:',
      });
      return;
    }

    case 'customer_add_monthly_price': {
      const price = Number(text);

      if (!Number.isFinite(price) || price < 0) {
        await sendError(
          chatId,
          'Monthly price must be a valid positive number.'
        );
        return;
      }

      data.monthly_price = price;
      await setState(getUserId(message), 'customer_add_server_cost', data);

      await api.sendMessage({
        chat_id: chatId,
        text: 'Send server cost:',
      });
      return;
    }

    case 'customer_add_server_cost': {
      const cost = Number(text);

      if (!Number.isFinite(cost) || cost < 0) {
        await sendError(
          chatId,
          'Server cost must be a valid positive number.'
        );
        return;
      }

      data.server_cost = cost;
      await setState(getUserId(message), 'customer_add_notes', data);

      await api.sendMessage({
        chat_id: chatId,
        text: 'Send notes, or send "-" for no notes:',
      });
      return;
    }

    case 'customer_add_notes': {
      data.notes = text === '-' ? '' : text;
      data.status = 'ACTIVE';

      try {
        const customer = await addCustomer(data);
        await clearState(getUserId(message));

        await api.sendMessage({
          chat_id: chatId,
          text:
            `✅ <b>Customer Added</b>\n\n` +
            `🆔 ID: <b>${escapeHtml(customer.customer_id)}</b>\n` +
            `👤 Name: <b>${escapeHtml(customer.name)}</b>\n` +
            `🤖 Bot: <b>${escapeHtml(customer.botname)}</b>\n` +
            `📅 Due: <b>${escapeHtml(customer.due_date)}</b>`,
          parse_mode: 'HTML',
          reply_markup: mainMenu(),
        });
      } catch (error) {
        console.error('Add customer failed:', error);

        if (error.message === 'CUSTOMER_EXISTS') {
          await sendError(
            chatId,
            'A customer with this ID already exists.'
          );
        } else {
          await sendError(chatId, 'Failed to add customer.');
        }
      }
      return;
    }
  }
}

// ─────────────────────────────────────────────
// Search Customer
// ─────────────────────────────────────────────
async function handleSearchCustomer(message, text) {
  const chatId = message.chat.id;
  const userId = getUserId(message);

  const customerId = Number(text);

  if (!Number.isInteger(customerId)) {
    await sendError(chatId, 'Customer ID must be a number.');
    return;
  }

  await clearState(userId);
  await searchCustomer(chatId, customerId);
}

// ─────────────────────────────────────────────
// Renew Customer
// ─────────────────────────────────────────────
async function handleRenewCustomer(message, state, data, text) {
  const chatId = message.chat.id;

  if (state.state === 'customer_renew_customer_id') {
    const customerId = Number(text);

    if (!Number.isInteger(customerId)) {
      await sendError(chatId, 'Customer ID must be a number.');
      return;
    }

    const customer = await searchCustomerSilently(customerId);

    if (!customer) {
      await sendError(chatId, 'Customer was not found.');
      return;
    }

    data.customer_id = customerId;
    await setState(getUserId(message), 'customer_renew_due_date', data);

    await api.sendMessage({
      chat_id: chatId,
      text:
        `Current due date: <b>${escapeHtml(customer.due_date)}</b>\n\n` +
        'Send new due date (YYYY-MM-DD):',
      parse_mode: 'HTML',
    });
    return;
  }

  if (state.state === 'customer_renew_due_date') {
    if (!isValidDate(text)) {
      await sendError(chatId, 'Invalid date. Use YYYY-MM-DD.');
      return;
    }

    try {
      const customer = await renewCustomer(data.customer_id, text);
      await clearState(getUserId(message));

      await api.sendMessage({
        chat_id: chatId,
        text:
          `✅ <b>Customer Renewed</b>\n\n` +
          `🆔 ID: <b>${escapeHtml(customer.customer_id)}</b>\n` +
          `👤 Name: <b>${escapeHtml(customer.name)}</b>\n` +
          `📅 New Due Date: <b>${escapeHtml(customer.due_date)}</b>\n` +
          `📌 Status: <b>${escapeHtml(customer.status)}</b>`,
        parse_mode: 'HTML',
        reply_markup: mainMenu(),
      });
    } catch (error) {
      console.error('Renew customer failed:', error);
      await sendError(chatId, 'Failed to renew customer.');
    }
  }
}

// ─────────────────────────────────────────────
// Delete Customer
// ─────────────────────────────────────────────
async function handleDeleteCustomer(message, text) {
  const chatId = message.chat.id;

  const customerId = Number(text);

  if (!Number.isInteger(customerId)) {
    await sendError(chatId, 'Customer ID must be a number.');
    return;
  }

  const customer = await searchCustomerSilently(customerId);

  if (!customer) {
    await sendError(chatId, 'Customer was not found.');
    return;
  }

  try {
    await deleteCustomer(customerId);
    await clearState(getUserId(message));

    await api.sendMessage({
      chat_id: chatId,
      text:
        `🗑 <b>Customer Deleted</b>\n\n` +
        `ID: <b>${escapeHtml(customer.customer_id)}</b>\n` +
        `Name: <b>${escapeHtml(customer.name)}</b>`,
      parse_mode: 'HTML',
      reply_markup: mainMenu(),
    });
  } catch (error) {
    console.error('Delete customer failed:', error);
    await sendError(chatId, 'Failed to delete customer.');
  }
}

// ─────────────────────────────────────────────
// Edit Customer
// ─────────────────────────────────────────────
async function handleEditCustomer(message, state, data, text) {
  const chatId = message.chat.id;

  if (state.state === 'customer_edit_customer_id') {
    const customerId = Number(text);

    if (!Number.isInteger(customerId)) {
      await sendError(chatId, 'Customer ID must be a number.');
      return;
    }

    const customer = await searchCustomerSilently(customerId);

    if (!customer) {
      await sendError(chatId, 'Customer was not found.');
      return;
    }

    data.customer_id = customerId;
    await showEditCustomer(chatId, null, customerId);
    return;
  }

  if (state.state === 'customer_edit_value') {
    const field = data.field;
    const customerId = data.customer_id;

    let value = text;

    if (field === 'monthly_price' || field === 'server_cost') {
      value = Number(text);

      if (!Number.isFinite(value) || value < 0) {
        await sendError(
          chatId,
          'Value must be a valid positive number.'
        );
        return;
      }
    }

    if (field === 'due_date') {
      if (!isValidDate(text)) {
        await sendError(chatId, 'Invalid date. Use YYYY-MM-DD.');
        return;
      }
    }

    if (field === 'status') {
      const status = text.toUpperCase();

      if (status !== 'ACTIVE' && status !== 'EXPIRED') {
        await sendError(chatId, 'Status must be ACTIVE or EXPIRED.');
        return;
      }

      value = status;
    }

    try {
      const customer = await updateCustomer(customerId, field, value);
      await clearState(getUserId(message));

      await api.sendMessage({
        chat_id: chatId,
        text:
          `✅ <b>Customer Updated</b>\n\n` +
          `🆔 ID: <b>${escapeHtml(customer.customer_id)}</b>\n` +
          `👤 Name: <b>${escapeHtml(customer.name)}</b>\n` +
          `🤖 Bot: <b>${escapeHtml(customer.botname)}</b>\n` +
          `📅 Due: <b>${escapeHtml(customer.due_date)}</b>\n` +
          `📌 Status: <b>${escapeHtml(customer.status)}</b>`,
        parse_mode: 'HTML',
        reply_markup: mainMenu(),
      });
    } catch (error) {
      console.error('Edit customer failed:', error);
      await sendError(chatId, 'Failed to update customer.');
    }
  }
}

// ─────────────────────────────────────────────
// Add Payment
// ─────────────────────────────────────────────
async function handleAddPayment(message, state, data, text) {
  const chatId = message.chat.id;

  if (state.state === 'payment_customer_id') {
    const customerId = Number(text);

    if (!Number.isInteger(customerId)) {
      await sendError(chatId, 'Customer ID must be a number.');
      return;
    }

    const customer = await searchCustomerSilently(customerId);

    if (!customer) {
      await sendError(chatId, 'Customer was not found.');
      return;
    }

    data.customer_id = customerId;
    await setState(getUserId(message), 'payment_amount', data);

    await api.sendMessage({
      chat_id: chatId,
      text: 'Send payment amount:',
    });
    return;
  }

  if (state.state === 'payment_amount') {
    const amount = Number(text);

    if (!Number.isFinite(amount) || amount < 0) {
      await sendError(chatId, 'Amount must be a valid positive number.');
      return;
    }

    data.amount = amount;
    await setState(getUserId(message), 'payment_type', data);

    await api.sendMessage({
      chat_id: chatId,
      text: 'Select payment type:',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🔄 Renewal',
              callback_data: 'ptype_renew',
            },
          ],
          [
            {
              text: '➕ Others',
              callback_data: 'ptype_others',
            },
          ],
        ],
      },
    });
    return;
  }

  if (state.state === 'payment_description') {
    data.description = text;

    try {
      const payment = await addPayment(data);
      await clearState(getUserId(message));

      await api.sendMessage({
        chat_id: chatId,
        text:
          `✅ <b>Payment Added</b>\n\n` +
          `🆔 Customer ID: <b>${escapeHtml(payment.customer_id)}</b>\n` +
          `💵 Amount: <b>${formatMoney(payment.amount)}</b>\n` +
          `📊 Type: <b>${escapeHtml(payment.type)}</b>\n` +
          `📝 Description: ${escapeHtml(payment.description || '-')}`,
        parse_mode: 'HTML',
        reply_markup: mainMenu(),
      });
    } catch (error) {
      console.error('Add payment failed:', error);
      await sendError(chatId, 'Failed to add payment.');
    }
  }
}

// ─────────────────────────────────────────────
// Add Expense
// ─────────────────────────────────────────────
async function handleAddExpense(message, state, data, text) {
  const chatId = message.chat.id;

  if (state.state === 'expense_amount') {
    const amount = Number(text);

    if (!Number.isFinite(amount) || amount < 0) {
      await sendError(chatId, 'Amount must be a valid positive number.');
      return;
    }

    data.amount = amount;
    await setState(getUserId(message), 'expense_description', data);

    await api.sendMessage({
      chat_id: chatId,
      text: 'Send expense description:',
    });
    return;
  }

  if (state.state === 'expense_description') {
    data.description = text;

    try {
      const expense = await addExpense(data);
      await clearState(getUserId(message));

      await api.sendMessage({
        chat_id: chatId,
        text:
          `✅ <b>Expense Added</b>\n\n` +
          `💵 Amount: <b>${formatMoney(expense.amount)}</b>\n` +
          `📝 Description: ${escapeHtml(expense.description || '-')}`,
        parse_mode: 'HTML',
        reply_markup: mainMenu(),
      });
    } catch (error) {
      console.error('Add expense failed:', error);
      await sendError(chatId, 'Failed to add expense.');
    }
  }
}

// ─────────────────────────────────────────────
// Customer Logs by Customer
// ─────────────────────────────────────────────
async function handleCustomerLogsByCustomer(message, text) {
  const chatId = message.chat.id;
  const userId = getUserId(message);

  const customerId = Number(text);

  if (!Number.isInteger(customerId)) {
    await sendError(chatId, 'Customer ID must be a number.');
    return;
  }

  await clearState(userId);
  await getLogsByCustomer(chatId, null, customerId);
}

// ─────────────────────────────────────────────
// Silent lookup
// ─────────────────────────────────────────────
async function searchCustomerSilently(customerId) {
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

// ─────────────────────────────────────────────
// Main Message Handler
// ─────────────────────────────────────────────
export default async function (message, ctx) {
  if (!message || !message.chat) {
    return;
  }

  const text = message.text;

  if (!text) {
    return;
  }

  const userId = getUserId(message);

  if (!userId) {
    return;
  }

  // Admin check
  if (!isAdmin(userId)) {
    await handleAccessDenied(message.chat.id);
    return;
  }

  // /start
  if (text === '/start') {
    await handleStart(message);
    return;
  }

  // Ignore other commands
  if (isCommand(text)) {
    return;
  }

  const state = await getState(userId);

  if (!state) {
    return;
  }

  const data = parseStateData(state);

  // Customer Add
  if (state.state.startsWith('customer_add_')) {
    await handleAddCustomer(message, state, data, text);
    return;
  }

  // Customer Search
  if (state.state === 'customer_search') {
    await handleSearchCustomer(message, text);
    return;
  }

  // Customer Renew
  if (state.state.startsWith('customer_renew_')) {
    await handleRenewCustomer(message, state, data, text);
    return;
  }

  // Customer Delete
  if (state.state === 'customer_delete') {
    await handleDeleteCustomer(message, text);
    return;
  }

  // Customer Edit
  if (state.state.startsWith('customer_edit_')) {
    await handleEditCustomer(message, state, data, text);
    return;
  }

  // Add Payment
  if (
    state.state === 'payment_customer_id' ||
    state.state === 'payment_amount' ||
    state.state === 'payment_description'
  ) {
    await handleAddPayment(message, state, data, text);
    return;
  }

  // Add Expense
  if (
    state.state === 'expense_amount' ||
    state.state === 'expense_description'
  ) {
    await handleAddExpense(message, state, data, text);
    return;
  }

  // Customer Logs by Customer
  if (state.state === 'customer_logs_by_customer') {
    await handleCustomerLogsByCustomer(message, text);
    return;
  }

  console.log(`Unhandled message state: ${state.state}`);
}