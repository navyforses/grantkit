import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL არ არის დაყენებული");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

const [cols] = await conn.query<any[]>(
  `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_TYPE
   FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'grants'
     AND COLUMN_NAME IN ('address','latitude','longitude','serviceArea','officeHours','geocodedAt',
                         'service_area','office_hours','geocoded_at')
   ORDER BY COLUMN_NAME`
);

const [idx] = await conn.query<any[]>(
  `SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
   FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'grants'
     AND INDEX_NAME IN ('grants_lat_lng_idx','grants_service_area_idx')
   ORDER BY INDEX_NAME, SEQ_IN_INDEX`
);

const [count] = await conn.query<any[]>(`SELECT COUNT(*) AS total FROM grants WHERE isActive = 1`);

const [allCols] = await conn.query<any[]>(
  `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'grants'
   ORDER BY ORDINAL_POSITION`
);

console.log("\n=== Phase 1 columns (address/lat/lng/etc) ===");
if (cols.length === 0) {
  console.log("❌ არცერთი ახალი column არ არსებობს — migration არ applied-ია");
} else {
  console.table(cols);
}

console.log("\n=== Phase 1 indexes ===");
if (idx.length === 0) {
  console.log("❌ არცერთი ახალი index არ არსებობს");
} else {
  console.table(idx);
}

console.log(`\n=== Grants total ===`);
console.table(count);

console.log("\n=== All grants table columns (ordered) ===");
console.log(allCols.map((c: any) => c.COLUMN_NAME).join(", "));

await conn.end();
process.exit(0);
