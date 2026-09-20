import { table, integer, text, real, sql } from 'sdk/db';

// ─────────────────────────────────────────────
// Customers
// ─────────────────────────────────────────────
export const customers = table('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customer_id: text('customer_id').notNull().unique(),
  botname: text('botname'),
  name: text('name').notNull(),
  register_date: text('register_date').notNull(),
  due_date: text('due_date').notNull(),
  monthly_price: real('monthly_price').default(0),
  server_cost: real('server_cost').default(0),
  status: text('status').default('ACTIVE'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ─────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────
export const payments = table('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customer_id: text('customer_id'),
  amount: real('amount').notNull(),
  type: text('type').notNull(),
  description: text('description'),
  payment_date: text('payment_date').default(sql`CURRENT_TIMESTAMP`),
});

// ─────────────────────────────────────────────
// Expenses
// ─────────────────────────────────────────────
export const expenses = table('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: real('amount').notNull(),
  description: text('description'),
  expense_date: text('expense_date').default(sql`CURRENT_TIMESTAMP`),
});

// ─────────────────────────────────────────────
// Customer Logs
// ─────────────────────────────────────────────
export const customer_logs = table('customer_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customer_id: text('customer_id').notNull(),
  action: text('action').notNull(),
  description: text('description'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ─────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────
export const settings = table('settings', {
  key: text('key').primaryKey(),
  value: text('value'),
});

// ─────────────────────────────────────────────
// Bot States (persistent FSM)
// ─────────────────────────────────────────────
export const bot_states = table('bot_states', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().unique(),
  state: text('state').notNull(),
  data: text('data'),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
