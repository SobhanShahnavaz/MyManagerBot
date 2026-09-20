import { db } from 'sdk';

// Get current state
export async function getState(userId) {
  return await db.get(
    `
    SELECT *
    FROM bot_states
    WHERE user_id = :user_id
    LIMIT 1
    `,
    {
      ':user_id': userId,
    }
  );
}

// Set state
export async function setState(userId, state, data = null) {
  const existing = await getState(userId);

  const jsonData = data === null
    ? null
    : JSON.stringify(data);

  if (existing) {
    await db.run(
      `
      UPDATE bot_states
      SET
        state = :state,
        data = :data,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = :user_id
      `,
      {
        ':user_id': userId,
        ':state': state,
        ':data': jsonData,
      }
    );

    return;
  }

  await db.run(
    `
    INSERT INTO bot_states (
      user_id,
      state,
      data
    )
    VALUES (
      :user_id,
      :state,
      :data
    )
    `,
    {
      ':user_id': userId,
      ':state': state,
      ':data': jsonData,
    }
  );
}


// Clear state
export async function clearState(userId) {
  await db.run(
    `
    DELETE FROM bot_states
    WHERE user_id = :user_id
    `,
    {
      ':user_id': userId,
    }
  );
}
// Update only state data

export async function updateStateData(userId, data) {
  const existing = await getState(userId);

  if (!existing) {
    return;
  }

  await db.run(
    `
    UPDATE bot_states
    SET
      data = :data,
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = :user_id
    `,
    {
      ':user_id': userId,
      ':data': JSON.stringify(data),
    }
  );
}


// Parse state data safely
export function parseStateData(state) {
  if (!state || !state.data) {
    return {};
  }

  try {
    return JSON.parse(state.data);
  } catch (error) {
    console.error('Failed to parse state data:', error);
    return {};
  }
}

