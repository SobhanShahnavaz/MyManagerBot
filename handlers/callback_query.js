// handlers/callback_query.js

import { api } from 'sdk';
import { showDashboard } from 'lib/dashboard';
import {
  listCustomers,
  showEditCustomer,
  getLastLogs,
  getLogsByAction,
  getLogsByCustomer,
} from 'lib/customers';
import {
  showFinanceReport,
  getFinanceSummary,
} from 'lib/finance';
import {
  setState,
  clearState,
  getState,
} from 'lib/state';

// ─────────────────────────────────────────────
// Admin Configuration
// ─────────────────────────────────────────────
const ADMIN_IDS = [
  // Put your Telegram admin IDs here.
  // Example: 123456789, 987654321
];

function isAdmin(userId) {
  return ADMIN_IDS.includes(Number(userId));
}

function getUserId(callbackQuery) {
  return callbackQuery.from?.id;
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

function customerMenu() {
  return {
    inline_keyboard: [
      [
        {
          text: '➕ Add Customer',
          callback_data: 'customer_add',
        },
      ],
      [
        {
          text: '📜 Logs',
          callback_data: 'cust_logs',
        },
      ],
      [
        {
          text: '🔍 Search',
          callback_data: 'customer_search',
        },
        {
          text: '📋 List',
          callback_data: 'customer_list_0',
        },
      ],
      [
        {
          text: 'RenewDue',
          callback_data: 'renewdue',
        },
      ],
      [
        {
          text: 'RemoveCust',
          callback_data: 'removecust',
        },
      ],
      [
        {
          text: '✏️ Edit Customer',
          callback_data: 'edit_customer',
        },
      ],
      [
        {
          text: '⬅️ Back',
          callback_data: 'back_main',
        },
      ],
    ],
  };
}

function financeMenu() {
  return {
    inline_keyboard: [
      [
        {
          text: '💵 Add Payment',
          callback_data: 'payment_add',
        },
      ],
      [
        {
          text: '📉 Add Expense',
          callback_data: 'expense_add',
        },
      ],
      [
        {
          text: '📊 Report',
          callback_data: 'finance_report',
        },
      ],
      [
        {
          text: '⬅️ Back',
          callback_data: 'back_main',
        },
      ],
    ],
  };
}

function settingsMenu() {
  return {
    inline_keyboard: [
      [
        {
          text: '⬅️ Back',
          callback_data: 'back_main',
        },
      ],
    ],
  };
}

function editCustomerMenu(customerId) {
  return {
    inline_keyboard: [
      [
        {
          text: '👤 Name',
          callback_data: `edit_name_${customerId}`,
        },
        {
          text: '🤖 Bot Name',
          callback_data: `edit_botname_${customerId}`,
        },
      ],
      [
        {
          text: '📅 Due Date',
          callback_data: `edit_due_date_${customerId}`,
        },
        {
          text: '💵 Monthly Price',
          callback_data: `edit_monthly_price_${customerId}`,
        },
      ],
      [
        {
          text: '🖥 Server Cost',
          callback_data: `edit_server_cost_${customerId}`,
        },
      ],
      [
        {
          text: '📝 Notes',
          callback_data: `edit_notes_${customerId}`,
        },
        {
          text: '⬛️ Status',
          callback_data: `edit_status_${customerId}`,
        },
      ],
      [
        {
          text: '⬅️ Back',
          callback_data: 'customers',
        },
      ],
    ],
  };
}

function customerLogsMenu() {
  return {
    inline_keyboard: [
      [
        {
          text: 'Last 10',
          callback_data: 'Last_actions_10',
        },
        {
          text: 'Last 20',
          callback_data: 'Last_actions_20',
        },
      ],
      [
        {
          text: 'Last 30',
          callback_data: 'Last_actions_30',
        },
        {
          text: 'Last 100',
          callback_data: 'Last_actions_100',
        },
      ],
      [
        {
          text: 'By Customer',
          callback_data: 'customer_logs',
        },
      ],
      [
        {
          text: 'Renews',
          callback_data: 'logs_by_RENEW',
        },
        {
          text: 'Adds',
          callback_data: 'logs_by_ADD',
        },
      ],
      [
        {
          text: 'Edits',
          callback_data: 'logs_by_EDIT',
        },
        {
          text: 'Deletes',
          callback_data: 'logs_by_DELETE',
        },
      ],
      [
        {
          text: '⬅️ Back',
          callback_data: 'customers',
        },
      ],
    ],
  };
}

function reportMenu() {
  return {
    inline_keyboard: [
      [
        {
          text: 'Overall',
          callback_data: 'report_overall',
        },
      ],
      [
        {
          text: 'Current Month',
          callback_data: 'report_current_month',
        },
      ],
      [
        {
          text: 'Previous Month',
          callback_data: 'report_previous_month',
        },
      ],
      [
        {
          text: '⬅️ Back',
          callback_data: 'finance',
        },
      ],
    ],
  };
}

// ─────────────────────────────────────────────
// Callback Query Handler
// ─────────────────────────────────────────────
export default async function (callbackQuery, ctx) {
  // Admin check
  const userId = getUserId(callbackQuery);
  if (!userId || !isAdmin(userId)) {
    try {
      await api.sendMessage({
        chat_id: callbackQuery.from.id,
        text: '⛔ Access denied.',
      });
    } catch (e) {
      console.error('Access denied message failed:', e);
    }
    await api.answerCallbackQuery({
      callback_query_id: callbackQuery.id,
    });
    return;
  }

  // Always acknowledge the callback
  try {
    await api.answerCallbackQuery({
      callback_query_id: callbackQuery.id,
    });
  } catch (error) {
    console.error('Failed to answer callback query:', error);
  }

  const data = callbackQuery.data;
  const message = callbackQuery.message;

  if (!message || !message.chat) {
    return;
  }

  const chatId = message.chat.id;

  // ─────────────────────────────────────
  // Dashboard
  // ─────────────────────────────────────
  if (data === 'dashboard') {
    await showDashboard(chatId, message.message_id);
    return;
  }

  // ─────────────────────────────────────
  // Customers
  // ─────────────────────────────────────
  if (data === 'customers') {
    await api.editMessageText({
      chat_id: chatId,
      message_id: message.message_id,
      text: 'Customer Management Menu:',
      reply_markup: customerMenu(),
    });
    return;
  }

  // ─────────────────────────────────────
  // Finance
  // ─────────────────────────────────────
  if (data === 'finance') {
    await api.editMessageText({
      chat_id: chatId,
      message_id: message.message_id,
      text: '💰 Finance Management',
      reply_markup: financeMenu(),
    });
    return;
  }

  // ─────────────────────────────────────
  // Settings
  // ─────────────────────────────────────
  if (data === 'settings') {
    await api.editMessageText({
      chat_id: chatId,
      message_id: message.message_id,
      text: '⚙️ Settings',
      reply_markup: settingsMenu(),
    });
    return;
  }

  // ─────────────────────────────────────
  // Back to Main Menu
  // ─────────────────────────────────────
  if (data === 'back_main') {
    await api.editMessageText({
      chat_id: chatId,
      message_id: message.message_id,
      text: 'Here is the Main Menu, Boss:',
      reply_markup: mainMenu(),
    });
    return;
  }

  // ─────────────────────────────────────
  // Customer Logs Menu
  // ─────────────────────────────────────
  if (data === 'cust_logs') {
    await api.editMessageText({
      chat_id: chatId,
      message_id: message.message_id,
      text: '📜 <b>Customer Logs</b>\n\nSelect log type:',
      parse_mode: 'HTML',
      reply_markup: customerLogsMenu(),
    });
    return;
  }

  // ─────────────────────────────────────
  // Customer List
  // ─────────────────────────────────────
  if (data.startsWith('customer_list_')) {
    const page = Number(data.replace('customer_list_', ''));
    await listCustomers(
      chatId,
      message.message_id,
      Number.isNaN(page) ? 0 : page
    );
    return;
  }

  // ─────────────────────────────────────
  // Edit Customer Menu
  // ─────────────────────────────────────
  if (data.startsWith('edit_customer_')) {
    const customerId = data.replace('edit_customer_', '');
    await showEditCustomer(
      chatId,
      message.message_id,
      customerId
    );
    return;
  }

  // ─────────────────────────────────────
  // Last Logs
  // ─────────────────────────────────────
  if (data === 'Last_actions_10') {
    await getLastLogs(chatId, message.message_id, 10);
    return;
  }
  if (data === 'Last_actions_20') {
    await getLastLogs(chatId, message.message_id, 20);
    return;
  }
  if (data === 'Last_actions_30') {
    await getLastLogs(chatId, message.message_id, 30);
    return;
  }
  if (data === 'Last_actions_100') {
    await getLastLogs(chatId, message.message_id, 100);
    return;
  }

  // ─────────────────────────────────────
  // Logs by Action
  // ─────────────────────────────────────
  if (data === 'logs_by_RENEW') {
    await getLogsByAction(chatId, message.message_id, 'RENEW');
    return;
  }
  if (data === 'logs_by_ADD') {
    await getLogsByAction(chatId, message.message_id, 'ADD');
    return;
  }
  if (data === 'logs_by_EDIT') {
    await getLogsByAction(chatId, message.message_id, 'EDIT');
    return;
  }
  if (data === 'logs_by_DELETE') {
    await getLogsByAction(chatId, message.message_id, 'DELETE');
    return;
  }

  // ─────────────────────────────────────
  // Logs by Customer
  // ─────────────────────────────────────
  if (data === 'customer_logs') {
    await setState(userId, 'customer_logs_by_customer', {});
    await api.sendMessage({
      chat_id: chatId,
      text: 'Send customer numeric ID:',
    });
    return;
  }

  // ─────────────────────────────────────
  // Add Customer
  // ─────────────────────────────────────
  if (data === 'customer_add') {
    await setState(userId, 'customer_add_customer_id', {});
    await api.sendMessage({
      chat_id: chatId,
      text: 'Send customer numeric ID:',
    });
    return;
  }

  // ─────────────────────────────────────
  // Search Customer
  // ─────────────────────────────────────
  if (data === 'customer_search') {
    await setState(userId, 'customer_search', {});
    await api.sendMessage({
      chat_id: chatId,
      text: 'Send customer numeric ID:',
    });
    return;
  }

  // ─────────────────────────────────────
  // Renew Due
  // ─────────────────────────────────────
  if (data === 'renewdue') {
    await setState(userId, 'customer_renew_customer_id', {});
    await api.sendMessage({
      chat_id: chatId,
      text: 'Send customer numeric ID:',
    });
    return;
  }

  // ─────────────────────────────────────
  // Remove Customer
  // ─────────────────────────────────────
  if (data === 'removecust') {
    await setState(userId, 'customer_delete', {});
    await api.sendMessage({
      chat_id: chatId,
      text: 'Send customer numeric ID:',
    });
    return;
  }

  // ─────────────────────────────────────
  // Edit Customer
  // ─────────────────────────────────────
  if (data === 'edit_customer') {
    await setState(userId, 'customer_edit_customer_id', {});
    await api.sendMessage({
      chat_id: chatId,
      text: 'Send customer numeric ID:',
    });
    return;
  }

  // ─────────────────────────────────────
  // Edit Field Buttons
  // ─────────────────────────────────────
  const editMatch = data.match(
    /^edit_(name|botname|due_date|monthly_price|server_cost|notes|status)_(\d+)$/
  );
  if (editMatch) {
    const field = editMatch[1];
    const customerId = Number(editMatch[2]);
    await setState(userId, 'customer_edit_value', {
      customer_id: customerId,
      field: field,
    });

    const fieldNames = {
      name: 'name',
      botname: 'bot name',
      due_date: 'due date (YYYY-MM-DD)',
      monthly_price: 'monthly price',
      server_cost: 'server cost',
      notes: 'notes',
      status: 'status (ACTIVE or EXPIRED)',
    };

    await api.sendMessage({
      chat_id: chatId,
      text: `Send the new ${fieldNames[field]}:`,
    });
    return;
  }

  // ─────────────────────────────────────
  // Payment Add
  // ─────────────────────────────────────
  if (data === 'payment_add') {
    await setState(userId, 'payment_customer_id', {});
    await api.sendMessage({
      chat_id: chatId,
      text: 'Send customer numeric ID:',
    });
    return;
  }

  // ─────────────────────────────────────
  // Payment Type
  // ─────────────────────────────────────
  if (data === 'ptype_renew' || data === 'ptype_others') {
    const state = await getState(userId);
    if (state && state.data) {
      const data_parsed = JSON.parse(state.data);
      data_parsed.type = data === 'ptype_renew' ? 'renew' : 'others';
      await setState(userId, 'payment_description', data_parsed);

      await api.sendMessage({
        chat_id: chatId,
        text: 'Send payment description:',
      });
    }
    return;
  }

  // ─────────────────────────────────────
  // Expense Add
  // ─────────────────────────────────────
  if (data === 'expense_add') {
    await setState(userId, 'expense_amount', {});
    await api.sendMessage({
      chat_id: chatId,
      text: 'Send expense amount:',
    });
    return;
  }

  // ─────────────────────────────────────
  // Finance Report
  // ─────────────────────────────────────
  if (data === 'finance_report') {
    await api.editMessageText({
      chat_id: chatId,
      message_id: message.message_id,
      text: '📊 Select report type:',
      reply_markup: reportMenu(),
    });
    return;
  }

  // ─────────────────────────────────────
  // Report Type
  // ─────────────────────────────────────
  if (data === 'report_overall') {
    const summary = await getFinanceSummary();
    await showFinanceReport(chatId, 'Overall', summary);
    return;
  }
  if (data === 'report_current_month') {
    const { currentMonthRange } = await import('lib/dates');
    const range = currentMonthRange(new Date());
    const summary = await getFinanceSummaryForRange(range.start, range.end);
    await showFinanceReport(chatId, 'Current Month', summary);
    return;
  }
  if (data === 'report_previous_month') {
    const { previousMonthRange } = await import('lib/dates');
    const range = previousMonthRange(new Date());
    const summary = await getFinanceSummaryForRange(range.start, range.end);
    await showFinanceReport(chatId, 'Previous Month', summary);
    return;
  }

  // ─────────────────────────────────────
  // Unknown callback
  // ─────────────────────────────────────
  console.log(`Unhandled callback: ${data}`);
}