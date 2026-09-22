
// lib/customers.js

import { db, api } from 'sdk';
import { escapeHtml, formatMoney } from 'lib/utils';
import { clearReminderSent } from 'lib/reminders';


function customerText(customer) {
  return `
👤 <b>Customer Information</b>

🆔 Customer ID: <b>${escapeHtml(customer.customer_id)}</b>
🤖 Bot Name: <b>${escapeHtml(customer.botname)}</b>
👤 Name: <b>${escapeHtml(customer.name)}</b>

📅 Register Date: <b>${escapeHtml(customer.register_date)}</b>
📅 Due Date: <b>${escapeHtml(customer.due_date)}</b>

💵 Monthly Price: <b>${formatMoney(customer.monthly_price)}</b>
🖥 Server Cost: <b>${formatMoney(customer.server_cost)}</b>

📌 Status: <b>${escapeHtml(customer.status)}</b>

📝 Notes:
<code>${escapeHtml(customer.notes)}</code>
`;
}


function customerKeyboard(customerId) {
  return {
    inline_keyboard: [
      [
        {
          text: '✏️ Edit Customer',
          callback_data: `edit_customer_${customerId}`,
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


function listKeyboard(page, hasNext) {
  const buttons = [];

  const navigation = [];

  if (page > 0) {
    navigation.push({
      text: '⬅️ Previous',
      callback_data: `customer_list_${page - 1}`,
    });
  }

  if (hasNext) {
    navigation.push({
      text: 'Next ➡️',
      callback_data: `customer_list_${page + 1}`,
    });
  }

  if (navigation.length > 0) {
    buttons.push(navigation);
  }

  buttons.push([
    {
      text: '⬅️ Back',
      callback_data: 'customers',
    },
  ]);

  return {
    inline_keyboard: buttons,
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


export async function customerExists(customerId) {
  const customer = await getCustomer(customerId);
  return Boolean(customer);
}


export async function addCustomer(data) {
  const existing = await getCustomer(data.customer_id);

  if (existing) {
    throw new Error('CUSTOMER_EXISTS');
  }

  await db.run(
    `
    INSERT INTO customers (
      customer_id,
      botname,
      name,
      register_date,
      due_date,
      monthly_price,
      server_cost,
      status,
      notes
    )
    VALUES (
      :customer_id,
      :botname,
      :name,
      :register_date,
      :due_date,
      :monthly_price,
      :server_cost,
      'ACTIVE',
      :notes
    )
    `,
    {
      ':customer_id': data.customer_id,
      ':botname': data.botname,
      ':name': data.name,
      ':register_date': data.register_date,
      ':due_date': data.due_date,
      ':monthly_price': data.monthly_price,
      ':server_cost': data.server_cost,
      ':notes': data.notes || '',
    }
  );

  await addCustomerLog(
    data.customer_id,
    'ADD',
    `Customer ${data.customer_id} added`
  );

  return await getCustomer(data.customer_id);
}


export async function updateCustomer(customerId, field, value) {
  const allowedFields = {
    name: 'name',
    botname: 'botname',
    due_date: 'due_date',
    monthly_price: 'monthly_price',
    server_cost: 'server_cost',
    notes: 'notes',
    status: 'status',
  };

  const column = allowedFields[field];

  if (!column) {
    throw new Error('INVALID_FIELD');
  }

  const customer = await getCustomer(customerId);

  if (!customer) {
    throw new Error('CUSTOMER_NOT_FOUND');
  }

  await db.run(
    `
    UPDATE customers
    SET ${column} = :value
    WHERE customer_id = :customer_id
    `,
    {
      ':value': value,
      ':customer_id': customerId,
    }
  );

  await addCustomerLog(
    customerId,
    'EDIT',
    `Changed ${field} from "${customer[field]}" to "${value}"`
  );

  return await getCustomer(customerId);
}


export async function renewCustomer(customerId, newDueDate) {
  const customer = await getCustomer(customerId);

  if (!customer) {
    throw new Error('CUSTOMER_NOT_FOUND');
  }

  await db.run(
    `
    UPDATE customers
    SET
      due_date = :due_date,
      status = 'ACTIVE'
    WHERE customer_id = :customer_id
    `,
    {
      ':due_date': newDueDate,
      ':customer_id': customerId,
    }
  );

  await addCustomerLog(
    customerId,
    'RENEW',
    `Due date changed from "${customer.due_date}" to "${newDueDate}"`
  );

  await clearReminderSent(customerId);

  return await getCustomer(customerId);
}


export async function deleteCustomer(customerId) {
  const customer = await getCustomer(customerId);

  if (!customer) {
    throw new Error('CUSTOMER_NOT_FOUND');
  }

  /*
   * customer_logs does not have a foreign key in Serverless,
   * so we can preserve the customer's history after deletion.
   */

  await db.run(
    `
    DELETE FROM customers
    WHERE customer_id = :customer_id
    `,
    {
      ':customer_id': customerId,
    }
  );

  await addCustomerLog(
    customerId,
    'DELETE',
    `Customer ${customerId} deleted`
  );

  return customer;
}


export async function addCustomerLog(customerId, action, description) {
  await db.run(
    `
    INSERT INTO customer_logs (
      customer_id,
      action,
      description
    )
    VALUES (
      :customer_id,
      :action,
      :description
    )
    `,
    {
      ':customer_id': customerId,
      ':action': action,
      ':description': description || '',
    }
  );
}


// ─────────────────────────────────────────────
// Search
// ─────────────────────────────────────────────

export async function searchCustomer(chatId, customerId) {
  const customer = await getCustomer(customerId);

  if (!customer) {
    await api.sendMessage({
      chat_id: chatId,
      text: `❌ Customer <b>${escapeHtml(customerId)}</b> was not found.`,
      parse_mode: 'HTML',
    });

    return null;
  }

  await api.sendMessage({
    chat_id: chatId,
    text: customerText(customer),
    parse_mode: 'HTML',
    reply_markup: customerKeyboard(customer.customer_id),
  });

  return customer;
}


// ─────────────────────────────────────────────
// List
// ─────────────────────────────────────────────

export async function listCustomers(chatId, messageId, page = 0) {
  const pageSize = 8;
  const offset = page * pageSize;

  const customers = await db.all(
    `
    SELECT *
    FROM customers
    ORDER BY id DESC
    LIMIT :limit
    OFFSET :offset
    `,
    {
      ':limit': pageSize + 1,
      ':offset': offset,
    }
  );

  const hasNext = customers.length > pageSize;
  const visibleCustomers = customers.slice(0, pageSize);

  if (visibleCustomers.length === 0) {
    const text = `
📋 <b>Customer List</b>

No customers found.
`;

    if (messageId) {
      await api.editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        reply_markup: listKeyboard(page, false),
      });
    } else {
      await api.sendMessage({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: listKeyboard(page, false),
      });
    }

    return;
  }

  let text = `📋 <b>Customer List</b>\n\n`;

  for (const customer of visibleCustomers) {
    text +=
      `🆔 <b>${escapeHtml(customer.customer_id)}</b> | ` +
      `👤 ${escapeHtml(customer.name)} | ` +
      `🤖 ${escapeHtml(customer.botname)}\n`;

    text +=
      `📅 ${escapeHtml(customer.due_date)} | ` +
      `📌 ${escapeHtml(customer.status)}\n\n`;
  }

  text += `Page: <b>${page + 1}</b>`;

  const params = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: listKeyboard(page, hasNext),
  };

  if (messageId) {
    await api.editMessageText({
      message_id: messageId,
      ...params,
    });
  } else {
    await api.sendMessage(params);
  }
}


// ─────────────────────────────────────────────
// Edit Customer Screen
// ─────────────────────────────────────────────

export async function showEditCustomer(
  chatId,
  messageId,
  customerId
) {
  const customer = await getCustomer(customerId);

  if (!customer) {
    await api.sendMessage({
      chat_id: chatId,
      text: `❌ Customer <b>${escapeHtml(customerId)}</b> was not found.`,
      parse_mode: 'HTML',
    });

    return null;
  }

  const text = `
✏️ <b>Edit Customer</b>

Customer ID: <b>${escapeHtml(customer.customer_id)}</b>
Name: <b>${escapeHtml(customer.name)}</b>
Bot Name: <b>${escapeHtml(customer.botname)}</b>
Due Date: <b>${escapeHtml(customer.due_date)}</b>
Monthly Price: <b>${formatMoney(customer.monthly_price)}</b>
Server Cost: <b>${formatMoney(customer.server_cost)}</b>
Status: <b>${escapeHtml(customer.status)}</b>
`;

  const params = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: editCustomerMenu(customerId),
  };

  if (messageId) {
    await api.editMessageText({
      message_id: messageId,
      ...params,
    });
  } else {
    await api.sendMessage(params);
  }

  return customer;
}


// ─────────────────────────────────────────────
// Logs
// ─────────────────────────────────────────────

export async function getLastLogs(chatId, messageId, limit) {
  const logs = await db.all(
    `
    SELECT *
    FROM customer_logs
    ORDER BY id DESC
    LIMIT :limit
    `,
    {
      ':limit': limit,
    }
  );

  let text = `📜 <b>Last ${limit} Actions</b>\n\n`;

  if (logs.length === 0) {
    text += 'No logs found.';
  } else {
    for (const log of logs) {
      text +=
        `#${log.id} | ` +
        `<b>${escapeHtml(log.action)}</b> | ` +
        `Customer: <b>${escapeHtml(log.customer_id)}</b>\n`;

      if (log.description) {
        text += `${escapeHtml(log.description)}\n`;
      }

      text += `${escapeHtml(log.created_at)}\n\n`;
    }
  }

  const params = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '⬅️ Back',
            callback_data: 'cust_logs',
          },
        ],
      ],
    },
  };

  if (messageId) {
    await api.editMessageText({
      message_id: messageId,
      ...params,
    });
  } else {
    await api.sendMessage(params);
  }
}


export async function getLogsByAction(
  chatId,
  messageId,
  action
) {
  const logs = await db.all(
    `
    SELECT *
    FROM customer_logs
    WHERE action = :action
    ORDER BY id DESC
    LIMIT 100
    `,
    {
      ':action': action,
    }
  );

  let text = `📜 <b>${escapeHtml(action)} Logs</b>\n\n`;

  if (logs.length === 0) {
    text += 'No logs found.';
  } else {
    for (const log of logs) {
      text +=
        `#${log.id} | ` +
        `Customer: <b>${escapeHtml(log.customer_id)}</b>\n`;

      if (log.description) {
        text += `${escapeHtml(log.description)}\n`;
      }

      text += `${escapeHtml(log.created_at)}\n\n`;
    }
  }

  const params = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '⬅️ Back',
            callback_data: 'cust_logs',
          },
        ],
      ],
    },
  };

  if (messageId) {
    await api.editMessageText({
      message_id: messageId,
      ...params,
    });
  } else {
    await api.sendMessage(params);
  }
}


export async function getLogsByCustomer(
  chatId,
  messageId,
  customerId
) {
  const logs = await db.all(
    `
    SELECT *
    FROM customer_logs
    WHERE customer_id = :customer_id
    ORDER BY id DESC
    LIMIT 100
    `,
    {
      ':customer_id': customerId,
    }
  );

  let text =
    `📜 <b>Customer Logs</b>\n\n` +
    `Customer: <b>${escapeHtml(customerId)}</b>\n\n`;

  if (logs.length === 0) {
    text += 'No logs found.';
  } else {
    for (const log of logs) {
      text +=
        `#${log.id} | ` +
        `<b>${escapeHtml(log.action)}</b>\n`;

      if (log.description) {
        text += `${escapeHtml(log.description)}\n`;
      }

      text += `${escapeHtml(log.created_at)}\n\n`;
    }
  }

  const params = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '⬅️ Back',
            callback_data: 'cust_logs',
          },
        ],
      ],
    },
  };

  if (messageId) {
    await api.editMessageText({
      message_id: messageId,
      ...params,
    });
  } else {
    await api.sendMessage(params);
  }
}


// ─────────────────────────────────────────────
// Customer Menu Screen
// ─────────────────────────────────────────────

export async function showCustomerMenu(chatId, messageId) {
  const params = {
    chat_id: chatId,
    text: 'Customer Management Menu:',
    reply_markup: {
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
    },
  };

  if (messageId) {
    await api.editMessageText({
      message_id: messageId,
      ...params,
    });
  } else {
    await api.sendMessage(params);
  }
}
