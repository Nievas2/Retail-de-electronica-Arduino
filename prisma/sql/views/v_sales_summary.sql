-- View: resumen por venta
-- items_total: total por items
-- paid_total: total pagado
-- balance: items_total - paid_total

CREATE OR REPLACE VIEW v_sales_summary AS
SELECT
  s.id AS sale_id,
  s.created_at,
  s.status,
  COALESCE(items.items_total, 0) AS items_total,
  COALESCE(pay.paid_total, 0) AS paid_total,
  COALESCE(items.items_total, 0) - COALESCE(pay.paid_total, 0) AS balance
FROM sales s
LEFT JOIN (
  SELECT
    sale_id,
    SUM(quantity * unit_price - discount) AS items_total
  FROM sale_items
  GROUP BY sale_id
) items ON items.sale_id = s.id
LEFT JOIN (
  SELECT
    sale_id,
    SUM(amount) AS paid_total
  FROM payments
  GROUP BY sale_id
) pay ON pay.sale_id = s.id;
