-- Reporte: ventas por día (solo CERRADA)
-- Versión base (referencia)

SELECT
  DATE(s."createdAt") AS day,
  COUNT(*) AS total_sales
FROM sales s
WHERE s.status = 'CERRADA'
GROUP BY DATE(s."createdAt")
ORDER BY day DESC;
