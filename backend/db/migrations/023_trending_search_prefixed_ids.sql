-- Give Super Admin trending search catalog rows a dedicated public id prefix
-- (parity with voucher- / flash- unique ids).

UPDATE trending_searches
SET id = 'trend-' || id
WHERE id IS NOT NULL
  AND id <> ''
  AND id NOT LIKE 'trend-%';

ALTER TABLE trending_searches
  ALTER COLUMN id SET DEFAULT ('trend-' || encode(gen_random_bytes(8), 'hex'));
