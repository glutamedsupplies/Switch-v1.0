"use strict";

const { query, withTransaction } = require("../db/pool");
const {
  asArray,
  assignOrderGroupIds,
  groupOrderEntries,
  orderGroupToRow,
  orderItemToRow,
  rowToOrderEntry,
  movementsFromOrderEntry,
} = require("../db/catalogHelpers");
const { upsertInventoryMovements } = require("./postgresProductsStore");

async function listOrdersFromPostgres() {
  const [groupResult, itemResult] = await Promise.all([
    query(`SELECT * FROM orders`),
    query(
      `
      SELECT *
      FROM order_items
      ORDER BY created_at_epoch_ms DESC, id
      `,
    ),
  ]);

  const groupsById = new Map(
    groupResult.rows.map((row) => [row.id, row]),
  );

  return itemResult.rows.map((itemRow) =>
    rowToOrderEntry(itemRow, groupsById.get(itemRow.order_group_id)),
  );
}

async function listOrdersPageFromPostgres({
  adminId = "",
  accountId = "",
  limit = 50,
  offset = 0,
} = {}) {
  const filters = [];
  const params = [];

  if (adminId) {
    params.push(adminId);
    filters.push(`admin_id = $${params.length}`);
  }
  if (accountId) {
    params.push(accountId);
    filters.push(`account_id = $${params.length}`);
  }

  const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM order_items ${whereSql}`,
    params,
  );
  const total = countResult.rows[0]?.total || 0;

  params.push(Math.max(1, Number(limit) || 50));
  params.push(Math.max(0, Number(offset) || 0));
  const itemResult = await query(
    `
    SELECT *
    FROM order_items
    ${whereSql}
    ORDER BY created_at_epoch_ms DESC, id
    LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params,
  );

  const groupIds = [...new Set(itemResult.rows.map((row) => row.order_group_id).filter(Boolean))];
  const groupResult = groupIds.length
    ? await query(`SELECT * FROM orders WHERE id = ANY($1::text[])`, [groupIds])
    : { rows: [] };
  const groupsById = new Map(groupResult.rows.map((row) => [row.id, row]));
  const items = itemResult.rows.map((itemRow) =>
    rowToOrderEntry(itemRow, groupsById.get(itemRow.order_group_id)),
  );

  return {
    items,
    total,
    limit: Math.max(1, Number(limit) || 50),
    offset: Math.max(0, Number(offset) || 0),
    hasMore: Math.max(0, Number(offset) || 0) + items.length < total,
  };
}

async function syncOrdersToPostgres(orders, options = {}) {
  const deleteMissing = options.deleteMissing !== false;
  const incomingIds = asArray(orders)
    .map((entry) => String(entry?.id ?? "").trim())
    .filter(Boolean);
  let existingEntries = asArray(options.existingEntries);
  if (!existingEntries.length && incomingIds.length) {
    const existingResult = await query(
      `SELECT id, order_group_id AS "orderGroupId", admin_id AS "adminId",
              account_id AS "accountId", created_at_epoch_ms AS "createdAtEpochMs"
       FROM order_items
       WHERE id = ANY($1::text[])`,
      [incomingIds],
    );
    existingEntries = existingResult.rows;
  }
  const incoming = assignOrderGroupIds(asArray(orders), {
    mode: options.mode === "stable" ? "stable" : "random",
    existingEntries,
  });
  const groups = groupOrderEntries(incoming);
  const incomingGroupIds = groups.map((group) => group.orderGroupId).filter(Boolean);
  const incomingItemIds = incoming
    .map((entry) => String(entry?.id ?? "").trim())
    .filter(Boolean);

  await withTransaction(async (client) => {
    for (const group of groups) {
      const groupRow = orderGroupToRow(group);
      await client.query(
        `
        INSERT INTO orders (
          id, order_group_id, admin_id, account_id, created_at_epoch_ms,
          stage, paid_at, packed_at, shipped_at, received_at, cancelled_at,
          return_requested_at, waybill_printed_at, extra_data, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, $14::jsonb, $15, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          order_group_id = EXCLUDED.order_group_id,
          admin_id = EXCLUDED.admin_id,
          account_id = EXCLUDED.account_id,
          created_at_epoch_ms = EXCLUDED.created_at_epoch_ms,
          stage = EXCLUDED.stage,
          paid_at = COALESCE(orders.paid_at, EXCLUDED.paid_at),
          packed_at = COALESCE(orders.packed_at, EXCLUDED.packed_at),
          shipped_at = COALESCE(orders.shipped_at, EXCLUDED.shipped_at),
          received_at = COALESCE(orders.received_at, EXCLUDED.received_at),
          cancelled_at = COALESCE(orders.cancelled_at, EXCLUDED.cancelled_at),
          return_requested_at = COALESCE(orders.return_requested_at, EXCLUDED.return_requested_at),
          waybill_printed_at = COALESCE(orders.waybill_printed_at, EXCLUDED.waybill_printed_at),
          extra_data = EXCLUDED.extra_data,
          updated_at = NOW()
        `,
        [
          groupRow.id,
          groupRow.order_group_id,
          groupRow.admin_id,
          groupRow.account_id,
          groupRow.created_at_epoch_ms,
          groupRow.stage,
          groupRow.paid_at,
          groupRow.packed_at,
          groupRow.shipped_at,
          groupRow.received_at,
          groupRow.cancelled_at,
          groupRow.return_requested_at,
          groupRow.waybill_printed_at,
          JSON.stringify(groupRow.extra_data || {}),
          groupRow.created_at,
        ],
      );

      const itemIds = [];
      for (const entry of group.items) {
        const itemRow = orderItemToRow(entry, group.orderGroupId, itemIds.length);
        if (!itemRow.id) {
          continue;
        }
        itemIds.push(itemRow.id);
        await client.query(
          `
          INSERT INTO order_items (
            id, order_group_id, admin_id, account_id, product_id, variant_id,
            quantity, unit_price, stage, created_at_epoch_ms,
            paid_at, packed_at, shipped_at, received_at, cancelled_at,
            return_requested_at, waybill_printed_at, extra_data,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10,
            $11, $12, $13, $14, $15,
            $16, $17, $18::jsonb,
            $19, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            order_group_id = EXCLUDED.order_group_id,
            admin_id = EXCLUDED.admin_id,
            account_id = EXCLUDED.account_id,
            product_id = EXCLUDED.product_id,
            variant_id = EXCLUDED.variant_id,
            quantity = EXCLUDED.quantity,
            unit_price = EXCLUDED.unit_price,
            stage = EXCLUDED.stage,
            created_at_epoch_ms = EXCLUDED.created_at_epoch_ms,
            paid_at = COALESCE(order_items.paid_at, EXCLUDED.paid_at),
            packed_at = COALESCE(order_items.packed_at, EXCLUDED.packed_at),
            shipped_at = COALESCE(order_items.shipped_at, EXCLUDED.shipped_at),
            received_at = COALESCE(order_items.received_at, EXCLUDED.received_at),
            cancelled_at = COALESCE(order_items.cancelled_at, EXCLUDED.cancelled_at),
            return_requested_at = COALESCE(
              order_items.return_requested_at,
              EXCLUDED.return_requested_at
            ),
            waybill_printed_at = COALESCE(
              order_items.waybill_printed_at,
              EXCLUDED.waybill_printed_at
            ),
            extra_data = EXCLUDED.extra_data,
            updated_at = NOW()
          `,
          [
            itemRow.id,
            itemRow.order_group_id,
            itemRow.admin_id,
            itemRow.account_id,
            itemRow.product_id,
            itemRow.variant_id,
            itemRow.quantity,
            itemRow.unit_price,
            itemRow.stage,
            itemRow.created_at_epoch_ms,
            itemRow.paid_at,
            itemRow.packed_at,
            itemRow.shipped_at,
            itemRow.received_at,
            itemRow.cancelled_at,
            itemRow.return_requested_at,
            itemRow.waybill_printed_at,
            JSON.stringify(itemRow.extra_data || {}),
            itemRow.created_at,
          ],
        );

        await upsertInventoryMovements(
          client,
          movementsFromOrderEntry({ ...entry, orderGroupId: group.orderGroupId }),
        );
      }

      if (itemIds.length) {
        await client.query(
          `
          DELETE FROM order_items
          WHERE order_group_id = $1
            AND id <> ALL($2::text[])
          `,
          [group.orderGroupId, itemIds],
        );
      }
    }

    if (deleteMissing) {
      if (incomingGroupIds.length) {
        await client.query(
          `DELETE FROM orders WHERE id <> ALL($1::text[])`,
          [incomingGroupIds],
        );
      } else {
        await client.query(`DELETE FROM orders`);
      }

      if (incomingItemIds.length) {
        await client.query(
          `DELETE FROM order_items WHERE id <> ALL($1::text[])`,
          [incomingItemIds],
        );
      } else if (!incoming.length) {
        await client.query(`DELETE FROM order_items`);
      }
    }
  });

  return incoming;
}

module.exports = {
  listOrdersFromPostgres,
  listOrdersPageFromPostgres,
  syncOrdersToPostgres,
};
