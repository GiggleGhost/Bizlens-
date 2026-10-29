import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import Papa from 'papaparse';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// SQLite in-memory database instance
let SQL: SqlJsStatic;
let db: Database;

// In-memory registry of datasets
interface ColumnDef {
  name: string;
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'DATE';
  sampleValues: any[];
  nullCount: number;
}

interface DatasetMetadata {
  id: string;
  name: string;
  tableName: string;
  isSynthetic: boolean;
  description: string;
  rowCount: number;
  columns: ColumnDef[];
  sampleRows: Record<string, any>[];
  createdAt: string;
}

const datasets: Map<string, DatasetMetadata> = new Map();
let rawSampleCsv = '';

// Synthetic dataset generator
function generateSyntheticRetailData(): { csvText: string; rows: Record<string, any>[] } {
  const cities = ['Hyderabad', 'Bengaluru', 'Mumbai', 'Delhi', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'];
  const categories = [
    {
      cat: 'Electronics',
      products: [
        { name: 'Sony WH-1000XM5 Headphones', price: 349 },
        { name: 'Apple iPad Air 11"', price: 599 },
        { name: 'Logitech MX Master 3S Mouse', price: 99 },
        { name: 'Dell UltraSharp 27 4K Monitor', price: 479 },
        { name: 'Anker 65W GaN Fast Charger', price: 39 },
      ],
    },
    {
      cat: 'Fashion',
      products: [
        { name: 'Nike Air Zoom Pegasus', price: 129 },
        { name: "Levi's 511 Slim Jeans", price: 68 },
        { name: 'Zara Premium Linen Shirt', price: 49 },
        { name: 'Samsonite Travel Duffle Bag', price: 119 },
      ],
    },
    {
      cat: 'Home & Kitchen',
      products: [
        { name: 'Philips Smart Air Purifier 2000', price: 219 },
        { name: 'Nespresso Vertuo Pop Coffee Maker', price: 139 },
        { name: 'Instant Pot Duo 7-in-1 Cooker', price: 99 },
        { name: 'Hydro Flask 32oz Insulated Bottle', price: 45 },
      ],
    },
    {
      cat: 'Health & Fitness',
      products: [
        { name: 'Garmin Forerunner 265 GPS Watch', price: 449 },
        { name: 'Lululemon Align 5mm Yoga Mat', price: 98 },
        { name: 'Bowflex SelectTech Dumbbells', price: 399 },
      ],
    },
    {
      cat: 'Office Supplies',
      products: [
        { name: 'Herman Miller Ergonomic Chair', price: 1195 },
        { name: 'Keychron K2 Mechanical Keyboard', price: 89 },
        { name: 'Vari Electric Standing Desk', price: 595 },
      ],
    },
  ];

  const customerNames = [
    'Aarav Sharma', 'Priya Patel', 'Rohan Verma', 'Ananya Iyer', 'Vikram Rao',
    'Neha Reddy', 'Rahul Gupta', 'Pooja Nair', 'Karan Malhotra', 'Sneha Kulkarni',
    'Arjun Mehta', 'Divya Joshi', 'Aditya Singh', 'Ritu Chopra', 'Manish Das',
    'Sunita Sen', 'Kavita Pillai', 'Siddharth Roy', 'Meera Bhatt', 'Abhishek Menon'
  ];

  const statuses = ['Delivered', 'Delivered', 'Delivered', 'Shipped', 'Shipped', 'Processing', 'Cancelled', 'Returned'];
  const paymentMethods = ['UPI', 'Credit Card', 'Net Banking', 'Cash on Delivery', 'Debit Card'];

  const rows: Record<string, any>[] = [];
  const startDate = new Date('2025-10-01').getTime();
  const endDate = new Date('2026-10-10').getTime();

  for (let i = 1; i <= 200; i++) {
    const orderId = `ORD-${2026000 + i}`;
    const randTime = startDate + Math.random() * (endDate - startDate);
    const orderDate = new Date(randTime).toISOString().split('T')[0];
    const customer = customerNames[Math.floor(Math.random() * customerNames.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const catObj = categories[Math.floor(Math.random() * categories.length)];
    const prodObj = catObj.products[Math.floor(Math.random() * catObj.products.length)];
    const quantity = Math.floor(Math.random() * 4) + 1;
    const discountPct = [0, 5, 10, 15, 20][Math.floor(Math.random() * 5)];
    const rawTotal = prodObj.price * quantity;
    const totalAmount = Number((rawTotal * (1 - discountPct / 100)).toFixed(2));
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const payment = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

    rows.push({
      order_id: orderId,
      order_date: orderDate,
      customer_name: customer,
      city: city,
      category: catObj.cat,
      product_name: prodObj.name,
      quantity: quantity,
      unit_price: prodObj.price,
      discount_pct: discountPct,
      total_amount: totalAmount,
      payment_method: payment,
      order_status: status,
    });
  }

  const csvText = Papa.unparse(rows);
  return { csvText, rows };
}

// Infer column types from values
function inferColumnType(values: any[]): 'INTEGER' | 'REAL' | 'DATE' | 'TEXT' {
  const nonNull = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
  if (nonNull.length === 0) return 'TEXT';

  // Check Date (YYYY-MM-DD or YYYY/MM/DD)
  const isDate = nonNull.every((v) => {
    const s = String(v).trim();
    return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s) && !isNaN(Date.parse(s));
  });
  if (isDate) return 'DATE';

  // Check Integer
  const isInt = nonNull.every((v) => {
    const s = String(v).trim();
    return /^-?\d+$/.test(s);
  });
  if (isInt) return 'INTEGER';

  // Check Real/Float
  const isFloat = nonNull.every((v) => {
    const s = String(v).trim();
    return /^-?\d+(\.\d+)?$/.test(s);
  });
  if (isFloat) return 'REAL';

  return 'TEXT';
}

// Clean and sanitize SQL identifiers (table/column names)
function sanitizeIdentifier(name: string): string {
  const cleaned = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return /^[0-9]/.test(cleaned) ? `col_${cleaned}` : cleaned || 'col';
}

// Create and register a dataset in SQLite
function registerDataset(
  id: string,
  name: string,
  tableName: string,
  isSynthetic: boolean,
  description: string,
  parsedData: Record<string, any>[]
): DatasetMetadata {
  if (parsedData.length === 0) {
    throw new Error('Dataset contains no data rows.');
  }

  const rawHeaders = Object.keys(parsedData[0]);
  const headerMap = new Map<string, string>();
  const sanitizedCols: ColumnDef[] = [];

  rawHeaders.forEach((origHeader) => {
    let cleanHeader = sanitizeIdentifier(origHeader);
    let counter = 1;
    while (sanitizedCols.some((c) => c.name === cleanHeader)) {
      cleanHeader = `${sanitizeIdentifier(origHeader)}_${counter++}`;
    }
    headerMap.set(origHeader, cleanHeader);

    const columnValues = parsedData.map((row) => row[origHeader]);
    const nullCount = columnValues.filter(
      (v) => v === null || v === undefined || String(v).trim() === ''
    ).length;
    const colType = inferColumnType(columnValues);

    sanitizedCols.push({
      name: cleanHeader,
      type: colType,
      sampleValues: columnValues.slice(0, 5),
      nullCount,
    });
  });

  // Re-map rows to sanitized column names
  const cleanRows = parsedData.map((row) => {
    const newRow: Record<string, any> = {};
    for (const [orig, clean] of headerMap.entries()) {
      let val = row[orig];
      if (val === null || val === undefined || String(val).trim() === '') {
        newRow[clean] = null;
      } else {
        const colDef = sanitizedCols.find((c) => c.name === clean);
        if (colDef?.type === 'INTEGER') {
          const num = parseInt(String(val).replace(/,/g, ''), 10);
          newRow[clean] = isNaN(num) ? null : num;
        } else if (colDef?.type === 'REAL') {
          const num = parseFloat(String(val).replace(/,/g, ''));
          newRow[clean] = isNaN(num) ? null : num;
        } else {
          newRow[clean] = String(val).trim();
        }
      }
    }
    return newRow;
  });

  // Create SQLite table
  db.run(`DROP TABLE IF EXISTS ${tableName};`);
  const colSqlDefs = sanitizedCols.map((c) => `"${c.name}" ${c.type}`).join(', ');
  db.run(`CREATE TABLE ${tableName} (${colSqlDefs});`);

  // Insert data rows in batch
  const placeholders = sanitizedCols.map(() => '?').join(', ');
  const colNamesList = sanitizedCols.map((c) => `"${c.name}"`).join(', ');
  const insertStmt = db.prepare(`INSERT INTO ${tableName} (${colNamesList}) VALUES (${placeholders})`);

  for (const row of cleanRows) {
    const values = sanitizedCols.map((c) => row[c.name]);
    insertStmt.run(values);
  }
  insertStmt.free();

  const metadata: DatasetMetadata = {
    id,
    name,
    tableName,
    isSynthetic,
    description,
    rowCount: cleanRows.length,
    columns: sanitizedCols,
    sampleRows: cleanRows.slice(0, 10),
    createdAt: new Date().toISOString(),
  };

  datasets.set(id, metadata);
  return metadata;
}

// SQL Trust & Safety Validator
function validateSQL(sql: string, allowedTable: string): { valid: boolean; error?: string; cleanSql?: string } {
  let cleaned = sql.trim().replace(/^```sql\s*/i, '').replace(/```$/, '').trim();

  // Strip trailing semicolon
  if (cleaned.endsWith(';')) {
    cleaned = cleaned.slice(0, -1).trim();
  }

  // Reject multiple queries (semicolon check outside quotes)
  const statements = cleaned.split(';').map((s) => s.trim()).filter(Boolean);
  if (statements.length > 1) {
    return { valid: false, error: 'Multiple statements are prohibited. Only a single SELECT query is permitted.' };
  }

  // Must begin with SELECT or WITH
  if (!/^(SELECT|WITH)\s+/i.test(cleaned)) {
    return { valid: false, error: 'Only read-only SELECT queries are authorized.' };
  }

  // Forbidden dangerous keywords
  const forbiddenKeywords = [
    /\bINSERT\b/i,
    /\bUPDATE\b/i,
    /\bDELETE\b/i,
    /\bDROP\b/i,
    /\bALTER\b/i,
    /\bCREATE\b/i,
    /\bTRUNCATE\b/i,
    /\bATTACH\b/i,
    /\bDETACH\b/i,
    /\bPRAGMA\b/i,
    /\bEXEC\b/i,
    /\bEXECUTE\b/i,
    /\bVACUUM\b/i,
    /\bREINDEX\b/i,
    /\bLOAD_EXTENSION\b/i,
    /\bINTO\b/i,
  ];

  for (const regex of forbiddenKeywords) {
    if (regex.test(cleaned)) {
      return { valid: false, error: `Forbidden SQL operation detected (${regex.source}). Queries are strictly read-only.` };
    }
  }

  // Ensure query actually reads from the designated table in FROM or JOIN
  const fromTableRegex = new RegExp(`\\b(FROM|JOIN)\\s+["\`]?${allowedTable}["\`]?\\b`, 'i');
  if (!fromTableRegex.test(cleaned)) {
    return { valid: false, error: `Query must read from the active dataset table: "${allowedTable}".` };
  }

  // Automatically enforce row safety limit if not present
  if (!/\bLIMIT\s+\d+/i.test(cleaned)) {
    cleaned = `${cleaned} LIMIT 500`;
  }

  return { valid: true, cleanSql: cleaned };
}

// Execute SQL in SQLite and format rows
function executeSqlSafely(sql: string): { columns: string[]; rows: Record<string, any>[]; executionTimeMs: number } {
  const startTime = performance.now();
  const result = db.exec(sql);
  const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  if (result.length === 0) {
    return { columns: [], rows: [], executionTimeMs };
  }

  const columns = result[0].columns;
  const rawValues = result[0].values;
  const rows = rawValues.map((rowVals) => {
    const obj: Record<string, any> = {};
    columns.forEach((col, idx) => {
      obj[col] = rowVals[idx];
    });
    return obj;
  });

  return { columns, rows, executionTimeMs };
}

// API error category tracking
export type ApiErrorCategory = 'none' | 'quota_exhausted' | 'billing_error' | 'invalid_key' | 'network_error';

let lastApiErrorCategory: ApiErrorCategory = 'none';
let lastApiErrorMessage: string = '';
let isGeminiQuotaExhausted = false;

// Helper with timeout, model fallback, and explicit error category recording
async function generateContentWithRetry(params: any): Promise<any> {
  if (isGeminiQuotaExhausted) {
    return null;
  }

  const candidateModels = [params.model || 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];

  for (const model of candidateModels) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 4000)
      );
      const res = await Promise.race([
        ai.models.generateContent({ ...params, model }),
        timeoutPromise,
      ]);
      lastApiErrorCategory = 'none';
      lastApiErrorMessage = '';
      return res;
    } catch (err: any) {
      const errStr = String(err?.message || err);
      const isQuota =
        errStr.includes('429') ||
        errStr.includes('RESOURCE_EXHAUSTED') ||
        errStr.includes('quota') ||
        errStr.includes('rate-limit') ||
        errStr.includes('exceeded your current quota');

      if (isQuota) {
        lastApiErrorCategory = 'quota_exhausted';
        lastApiErrorMessage = 'Gemini API free tier request limit reached (429 RESOURCE_EXHAUSTED).';
        continue;
      }

      if (errStr.includes('API_KEY') || errStr.includes('401') || errStr.includes('403') || errStr.includes('PERMISSION_DENIED')) {
        lastApiErrorCategory = 'invalid_key';
        lastApiErrorMessage = 'Gemini API authentication failed (invalid key or permissions).';
        break;
      }

      if (errStr.includes('billing') || errStr.includes('BILLING_DISABLED')) {
        lastApiErrorCategory = 'billing_error';
        lastApiErrorMessage = 'Gemini API billing or account quota configuration error.';
        break;
      }

      lastApiErrorCategory = 'network_error';
      lastApiErrorMessage = 'Gemini API request timed out or network error.';
      break;
    }
  }

  if (lastApiErrorCategory === 'quota_exhausted') {
    isGeminiQuotaExhausted = true;
  }
  return null;
}

// Deterministic intelligent SQL generator for business questions (works on any dataset & CSV)
// NEVER fabricates answers: if question cannot be answered from the schema, returns null.
function generateAnalyticalSql(question: string, dataset: DatasetMetadata, history?: any[]): string | null {
  const q = question.toLowerCase().trim();
  const tbl = dataset.tableName;
  const cols = dataset.columns;

  // 1. Identify column semantics with strict separation
  const numCols = cols.filter((c) => c.type === 'INTEGER' || c.type === 'REAL').map((c) => c.name);
  const textCols = cols.filter((c) => c.type === 'TEXT').map((c) => c.name);
  const dateCols = cols.filter((c) => c.type === 'DATE' || /date|month|year|time/i.test(c.name)).map((c) => c.name);

  // Identify metrics
  const amountCol = numCols.find((c) => /total_amount|sales|revenue|amount/i.test(c)) || numCols.find((c) => /price|cost/i.test(c));
  const qtyCol = numCols.find((c) => /quantity|qty|volume|count/i.test(c));
  const primaryMetric = amountCol || qtyCol || numCols[0];

  // Specific categoricals (DO NOT overlap customer and product!)
  const customerCol = textCols.find((c) => /customer|client|buyer|user|shopper|consumer/i.test(c));
  const productCol = textCols.find((c) => /^(product(_name)?|item(_name)?|title)$/i.test(c)) ||
                     textCols.find((c) => /product|item/i.test(c)) ||
                     textCols.find((c) => !/customer|client|buyer|user|city|state|status|method/i.test(c) && /title|name/i.test(c));
  const cityCol = textCols.find((c) => /city|location|state|region|branch|territory/i.test(c));
  const categoryCol = textCols.find((c) => /category|cat|dept|department|type|genre|group/i.test(c));
  const statusCol = textCols.find((c) => /status|state|stage|condition/i.test(c));
  const paymentCol = textCols.find((c) => /payment|method|gateway|tender/i.test(c));
  const dateCol = dateCols[0] || textCols.find((c) => /date|time|timestamp|day|month|year/i.test(c));

  // A. Raw data browsing / inspection
  if (/(show|list|display|preview|view)\s+(all\s+)?(orders|data|records|transactions|rows|table)/i.test(q)) {
    return `SELECT * FROM ${tbl} LIMIT 25;`;
  }

  // B. Specific city filter (e.g. "Now show Hyderabad only", "Total sales in Delhi", "How many in Bengaluru")
  const knownCities = ['hyderabad', 'bengaluru', 'bangalore', 'mumbai', 'delhi', 'chennai', 'pune', 'kolkata', 'ahmedabad', 'jaipur', 'surat', 'lucknow'];
  const matchedCity = knownCities.find((c) => q.includes(c));
  if (cityCol && matchedCity) {
    const searchCity = matchedCity === 'bangalore' ? 'bengaluru' : matchedCity;
    if (q.includes('how many') || q.includes('count') || q.includes('number of orders')) {
      return `SELECT "${cityCol}" AS city, COUNT(*) AS order_count FROM ${tbl} WHERE LOWER("${cityCol}") LIKE '%${searchCity}%' GROUP BY "${cityCol}";`;
    }
    if (primaryMetric) {
      return `SELECT "${cityCol}" AS city, ROUND(SUM("${primaryMetric}"), 2) AS total_sales, COUNT(*) AS order_count, ROUND(AVG("${primaryMetric}"), 2) AS avg_order_value FROM ${tbl} WHERE LOWER("${cityCol}") LIKE '%${searchCity}%' GROUP BY "${cityCol}";`;
    }
    return `SELECT "${cityCol}" AS city, COUNT(*) AS count FROM ${tbl} WHERE LOWER("${cityCol}") LIKE '%${searchCity}%' GROUP BY "${cityCol}";`;
  }

  // C. Specific order status filter / cancellation analysis
  const knownStatuses = ['cancelled', 'delivered', 'shipped', 'returned', 'processing', 'pending'];
  const matchedStatus = knownStatuses.find((s) => q.includes(s));
  if (statusCol && matchedStatus) {
    if (q.includes('break down') || q.includes('by city') || q.includes('across cities')) {
      if (cityCol) {
        return `SELECT "${cityCol}" AS city, COUNT(*) AS status_count FROM ${tbl} WHERE LOWER("${statusCol}") LIKE '%${matchedStatus}%' GROUP BY "${cityCol}" ORDER BY status_count DESC;`;
      }
    }
    if (primaryMetric && (q.includes('revenue') || q.includes('amount') || q.includes('sales'))) {
      return `SELECT "${statusCol}" AS order_status, COUNT(*) AS order_count, ROUND(SUM("${primaryMetric}"), 2) AS total_amount FROM ${tbl} WHERE LOWER("${statusCol}") LIKE '%${matchedStatus}%' GROUP BY "${statusCol}";`;
    }
    return `SELECT "${statusCol}" AS order_status, COUNT(*) AS order_count, ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM ${tbl}), 1) AS percentage_of_total FROM ${tbl} WHERE LOWER("${statusCol}") LIKE '%${matchedStatus}%' GROUP BY "${statusCol}";`;
  }

  // D. General status breakdown (e.g. "Which order status has the highest cancellation rate?", "Status breakdown")
  if (statusCol && (q.includes('cancellation rate') || q.includes('order status') || (q.includes('status') && (q.includes('breakdown') || q.includes('compare') || q.includes('rate') || q.includes('distribution'))))) {
    return `SELECT "${statusCol}" AS order_status, COUNT(*) AS order_count, ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM ${tbl}), 1) AS percentage FROM ${tbl} GROUP BY "${statusCol}" ORDER BY order_count DESC;`;
  }

  // E. Specific category filter (e.g. "Sales for Electronics", "Show Fashion")
  const knownCats = ['electronics', 'fashion', 'health & fitness', 'fitness', 'office supplies', 'office', 'home & kitchen', 'kitchen'];
  const matchedCat = knownCats.find((c) => q.includes(c));
  if (categoryCol && matchedCat) {
    const searchCat = matchedCat.replace('fitness', 'health').replace('office', 'office supplies').replace('kitchen', 'kitchen');
    if (primaryMetric) {
      return `SELECT "${categoryCol}" AS category, ROUND(SUM("${primaryMetric}"), 2) AS total_sales, COUNT(*) AS order_count FROM ${tbl} WHERE LOWER("${categoryCol}") LIKE '%${matchedCat}%' GROUP BY "${categoryCol}";`;
    }
    return `SELECT "${categoryCol}" AS category, COUNT(*) AS count FROM ${tbl} WHERE LOWER("${categoryCol}") LIKE '%${matchedCat}%' GROUP BY "${categoryCol}";`;
  }

  // F. Specific customer query (e.g. "Orders by Vikram Rao", "Purchases by Priya Patel")
  if (customerCol && (q.includes('customer') || q.includes('vikram') || q.includes('priya') || q.includes('aarav') || q.includes('rohan') || q.includes('ananya') || q.includes('who bought') || q.includes('spender'))) {
    // If asking for top customers ranking
    if (q.includes('top') || q.includes('best') || q.includes('highest') || q.includes('rank') || q.includes('spenders') || q.includes('buyers')) {
      const limitNum = q.match(/\b(?:top|first)\s+(\d+)\b/)?.[1] || '5';
      if (primaryMetric) {
        return `SELECT "${customerCol}" AS customer_name, ROUND(SUM("${primaryMetric}"), 2) AS total_spent, COUNT(*) AS order_count FROM ${tbl} GROUP BY "${customerCol}" ORDER BY total_spent DESC LIMIT ${limitNum};`;
      }
      return `SELECT "${customerCol}" AS customer_name, COUNT(*) AS order_count FROM ${tbl} GROUP BY "${customerCol}" ORDER BY order_count DESC LIMIT ${limitNum};`;
    }

    // Specific customer name search
    const sampleCust = ['vikram rao', 'priya patel', 'aarav sharma', 'rohan verma', 'ananya iyer', 'neha reddy', 'rahul gupta'].find((name) => q.includes(name));
    if (sampleCust) {
      if (primaryMetric) {
        return `SELECT "${customerCol}" AS customer_name, ROUND(SUM("${primaryMetric}"), 2) AS total_spent, COUNT(*) AS order_count FROM ${tbl} WHERE LOWER("${customerCol}") LIKE '%${sampleCust}%' GROUP BY "${customerCol}";`;
      }
      return `SELECT "${customerCol}" AS customer_name, COUNT(*) AS order_count FROM ${tbl} WHERE LOWER("${customerCol}") LIKE '%${sampleCust}%' GROUP BY "${customerCol}";`;
    }
  }

  // G. Product / Item ranking (MUST explicitly relate to product/item or best selling products)
  if (productCol && (q.includes('product') || q.includes('item') || q.includes('best selling') || q.includes('most sold') || q.includes('top selling') || (q.includes('top') && q.includes('selling')))) {
    const limitNum = q.match(/\b(?:top|first)\s+(\d+)\b/)?.[1] || '5';
    if (primaryMetric) {
      return `SELECT "${productCol}" AS product_name, ROUND(SUM("${primaryMetric}"), 2) AS total_revenue, COUNT(*) AS total_orders FROM ${tbl} GROUP BY "${productCol}" ORDER BY total_revenue DESC LIMIT ${limitNum};`;
    }
    return `SELECT "${productCol}" AS product_name, COUNT(*) AS total_count FROM ${tbl} GROUP BY "${productCol}" ORDER BY total_count DESC LIMIT ${limitNum};`;
  }

  // H. Compare or Aggregate by City (e.g. "Compare sales by city", "Total sales by city", "Cities by revenue")
  if (cityCol && (q.includes('city') || q.includes('cities') || q.includes('location') || q.includes('locations') || q.includes('region'))) {
    if (primaryMetric) {
      return `SELECT "${cityCol}" AS city, ROUND(SUM("${primaryMetric}"), 2) AS total_sales, COUNT(*) AS order_count FROM ${tbl} GROUP BY "${cityCol}" ORDER BY total_sales DESC;`;
    }
    return `SELECT "${cityCol}" AS city, COUNT(*) AS count FROM ${tbl} GROUP BY "${cityCol}" ORDER BY count DESC;`;
  }

  // I. Category aggregation (e.g. "Sales by category", "Compare categories", "Category breakdown")
  if (categoryCol && (q.includes('categor') || q.includes('dept') || q.includes('department'))) {
    if (primaryMetric) {
      return `SELECT "${categoryCol}" AS category, ROUND(SUM("${primaryMetric}"), 2) AS total_sales, COUNT(*) AS count FROM ${tbl} GROUP BY "${categoryCol}" ORDER BY total_sales DESC;`;
    }
    return `SELECT "${categoryCol}" AS category, COUNT(*) AS count FROM ${tbl} GROUP BY "${categoryCol}" ORDER BY count DESC;`;
  }

  // J. Payment method breakdown
  if (paymentCol && (q.includes('payment') || q.includes('upi') || q.includes('credit card') || q.includes('cash on delivery') || q.includes('cod') || q.includes('net banking'))) {
    if (primaryMetric) {
      return `SELECT "${paymentCol}" AS payment_method, COUNT(*) AS order_count, ROUND(SUM("${primaryMetric}"), 2) AS total_sales FROM ${tbl} GROUP BY "${paymentCol}" ORDER BY total_sales DESC;`;
    }
    return `SELECT "${paymentCol}" AS payment_method, COUNT(*) AS order_count FROM ${tbl} GROUP BY "${paymentCol}" ORDER BY order_count DESC;`;
  }

  // K. Monthly / Date trend (e.g. "Monthly sales trend", "Revenue by month", "Sales over time")
  if (dateCol && (q.includes('month') || q.includes('trend') || q.includes('over time') || q.includes('timeline') || q.includes('history') || q.includes('by date'))) {
    if (primaryMetric) {
      return `SELECT SUBSTR("${dateCol}", 1, 7) AS month, ROUND(SUM("${primaryMetric}"), 2) AS monthly_sales, COUNT(*) AS order_count FROM ${tbl} GROUP BY month ORDER BY month ASC;`;
    }
    return `SELECT SUBSTR("${dateCol}", 1, 7) AS month, COUNT(*) AS order_count FROM ${tbl} GROUP BY month ORDER BY month ASC;`;
  }

  // L. Total or Average calculations across entire dataset (WITHOUT grouping)
  if (primaryMetric && (q.includes('average') || q.includes('avg') || q.includes('mean'))) {
    return `SELECT ROUND(AVG("${primaryMetric}"), 2) AS average_${primaryMetric}, ROUND(MIN("${primaryMetric}"), 2) AS min_${primaryMetric}, ROUND(MAX("${primaryMetric}"), 2) AS max_${primaryMetric}, COUNT(*) AS total_orders FROM ${tbl};`;
  }

  if (primaryMetric && (q.includes('total sales') || q.includes('total revenue') || q.includes('overall sales') || q.includes('total amount') || q.includes('gross revenue') || q.includes('total revenue?'))) {
    return `SELECT ROUND(SUM("${primaryMetric}"), 2) AS total_${primaryMetric}, COUNT(*) AS total_orders, ROUND(AVG("${primaryMetric}"), 2) AS average_order_value FROM ${tbl};`;
  }

  if (q.includes('total orders') || q.includes('how many orders') || q.includes('total count') || q.includes('number of orders') || q.includes('order count') || q.includes('total transactions')) {
    return `SELECT COUNT(*) AS total_orders FROM ${tbl};`;
  }

  // M. Support for user-uploaded CSV matching column names directly
  for (const c of cols) {
    const cleanName = c.name.toLowerCase().replace(/_/g, ' ');
    if (q.includes(cleanName)) {
      if (c.type === 'INTEGER' || c.type === 'REAL') {
        if (q.includes('avg') || q.includes('average') || q.includes('mean')) {
          return `SELECT ROUND(AVG("${c.name}"), 2) AS avg_${c.name} FROM ${tbl};`;
        }
        return `SELECT ROUND(SUM("${c.name}"), 2) AS total_${c.name}, ROUND(AVG("${c.name}"), 2) AS avg_${c.name} FROM ${tbl};`;
      } else {
        if (primaryMetric) {
          return `SELECT "${c.name}", ROUND(SUM("${primaryMetric}"), 2) AS total_${primaryMetric}, COUNT(*) AS count FROM ${tbl} GROUP BY "${c.name}" ORDER BY total_${primaryMetric} DESC LIMIT 20;`;
        }
        return `SELECT "${c.name}", COUNT(*) AS count FROM ${tbl} GROUP BY "${c.name}" ORDER BY count DESC LIMIT 20;`;
      }
    }
  }

  // If question cannot be understood from the dataset schema, return null: NEVER FABRICATE AN ANSWER!
  return null;
}

// Format plural label cleanly (e.g. "city" -> "cities", "category" -> "categories")
function formatPluralLabel(singular: string): string {
  const clean = singular.replace(/_/g, ' ').trim().toLowerCase();
  if (clean.endsWith('y') && !clean.endsWith('ay') && !clean.endsWith('ey')) {
    return clean.slice(0, -1) + 'ies';
  }
  if (clean.endsWith('s') || clean.endsWith('status')) {
    return clean + 'es';
  }
  return clean + 's';
}

// Generate grounded explanations derived strictly from actual query results and question intent
function generateGroundedFallbackInsight(
  rows: Record<string, any>[],
  columns: string[],
  question: string,
  datasetName: string,
  executedSql: string
): {
  spokenExplanation: string;
  keyTakeaways: string[];
  followUps: string[];
} {
  const q = question.toLowerCase();

  if (rows.length === 0) {
    return {
      spokenExplanation: `No matching records were found in ${datasetName} for "${question}". Try adjusting your query or broadening your filters.`,
      keyTakeaways: ['Zero records matched the query criteria in the database.'],
      followUps: ['Compare sales by city', 'Top 5 products by revenue', 'Monthly sales trend'],
    };
  }

  const firstRow = rows[0];
  const keys = Object.keys(firstRow);
  const numKeys = keys.filter((k) => typeof firstRow[k] === 'number');
  const textKeys = keys.filter((k) => typeof firstRow[k] === 'string');

  let spoken = '';
  const takeaways: string[] = [];
  let followUps: string[] = [];

  // Case 1: Single aggregate row (e.g. Count, Sum, Avg)
  if (rows.length === 1) {
    const parts = keys.map((k) => {
      const val = firstRow[k];
      const label = k.replace(/_/g, ' ');
      const formatted = typeof val === 'number' ? (val % 1 === 0 ? val.toLocaleString() : val.toFixed(2)) : String(val);
      return `${label} is ${formatted}`;
    });
    spoken = `Based on the database records, ${parts.join(', and ')}.`;
    keys.forEach((k) => {
      const val = firstRow[k];
      const formatted = typeof val === 'number' ? (val % 1 === 0 ? val.toLocaleString() : val.toFixed(2)) : String(val);
      takeaways.push(`${k.replace(/_/g, ' ')}: ${formatted}`);
    });

    if (q.includes('hyderabad') || q.includes('city')) {
      followUps = [
        'Which products are most popular in this city?',
        'Compare sales across all cities',
        'Show orders by status in this city',
      ];
    } else if (q.includes('cancel')) {
      followUps = [
        'Break down cancelled orders by city',
        'Compare cancelled and delivered orders',
        'Which products have the highest cancellation count?',
      ];
    } else {
      followUps = [
        'Compare sales by city',
        'Top 5 products by revenue',
        'Monthly sales trend',
      ];
    }
  }
  // Case 2: Grouped breakdown / ranking (e.g. City, Category, Product, Status)
  else {
    const groupCol = textKeys[0] || keys[0];
    const metricCol = numKeys[0] || keys[1];

    const topItem = firstRow[groupCol];
    const topMetric = metricCol ? firstRow[metricCol] : null;
    const topMetricFormatted = typeof topMetric === 'number' ? (topMetric % 1 === 0 ? topMetric.toLocaleString() : topMetric.toFixed(2)) : String(topMetric ?? '');

    const secondRow = rows[1];
    const secondItem = secondRow ? secondRow[groupCol] : null;
    const secondMetric = secondRow && metricCol ? secondRow[metricCol] : null;
    const secondMetricFormatted = typeof secondMetric === 'number' ? (secondMetric % 1 === 0 ? secondMetric.toLocaleString() : secondMetric.toFixed(2)) : String(secondMetric ?? '');

    const totalSum = numKeys[0] ? rows.reduce((acc, r) => acc + (Number(r[numKeys[0]]) || 0), 0) : null;
    const totalFormatted = totalSum !== null ? (totalSum % 1 === 0 ? totalSum.toLocaleString() : totalSum.toFixed(2)) : null;

    const pluralLabel = formatPluralLabel(groupCol);

    if (groupCol && metricCol) {
      const metricLabel = metricCol.replace(/_/g, ' ');
      spoken = `${topItem} ranks highest with ${topMetricFormatted} ${metricLabel}`;
      if (secondItem) {
        spoken += `, followed by ${secondItem} with ${secondMetricFormatted}`;
      }
      spoken += `. A total of ${rows.length} ${pluralLabel} were analyzed.`;

      takeaways.push(`Top performer: ${topItem} (${topMetricFormatted} ${metricLabel})`);
      if (secondItem) {
        takeaways.push(`Runner up: ${secondItem} (${secondMetricFormatted} ${metricLabel})`);
      }
      if (totalFormatted) {
        takeaways.push(`Combined total across all ${rows.length} entries: ${totalFormatted}`);
      }
    } else {
      spoken = `Retrieved ${rows.length} ${pluralLabel} from ${datasetName} matching your query.`;
      takeaways.push(`Total records retrieved: ${rows.length}`);
    }

    // Dynamic schema-aware follow-ups
    if (groupCol && /city/i.test(groupCol)) {
      followUps = [
        `Show top products in ${topItem}`,
        'Compare sales by product category',
        'Show order cancellation rate by city',
      ];
    } else if (groupCol && /product/i.test(groupCol)) {
      followUps = [
        `Which city bought the most ${topItem}?`,
        'Compare sales by product category',
        'Show monthly sales trend',
      ];
    } else if (groupCol && /customer/i.test(groupCol)) {
      followUps = [
        `What products did ${topItem} purchase?`,
        'Compare sales by city',
        'Top 5 products by revenue',
      ];
    } else if (groupCol && /category/i.test(groupCol)) {
      followUps = [
        `Show the top 5 products in ${topItem}`,
        'Compare sales by city',
        'What is the order cancellation rate by category?',
      ];
    } else if (groupCol && /status/i.test(groupCol)) {
      followUps = [
        'Break down cancelled orders by city',
        'Compare cancelled and delivered orders',
        'Show top revenue products',
      ];
    } else {
      followUps = [
        'Compare sales by city',
        'Top 5 products by revenue',
        'Monthly sales trend',
      ];
    }
  }

  return {
    spokenExplanation: spoken,
    keyTakeaways: takeaways,
    followUps,
  };
}

// Determine best chart type based on query results
function suggestChartType(
  columns: string[],
  rows: Record<string, any>[]
): { chartType: 'kpi' | 'bar' | 'line' | 'pie' | 'table'; xAxis?: string; yAxis?: string } {
  if (rows.length === 0) return { chartType: 'table' };

  if (rows.length === 1 && columns.length <= 4) {
    return { chartType: 'kpi' };
  }

  // Find numeric and string/date columns
  const firstRow = rows[0];
  const numericCols = columns.filter((c) => typeof firstRow[c] === 'number');
  const stringOrDateCols = columns.filter((c) => typeof firstRow[c] === 'string');

  const dateCol = stringOrDateCols.find((c) => /date|month|year|day|time/i.test(c));

  if (dateCol && numericCols.length >= 1) {
    return { chartType: 'line', xAxis: dateCol, yAxis: numericCols[0] };
  }

  if (stringOrDateCols.length >= 1 && numericCols.length >= 1) {
    if (rows.length <= 7 && /status|category|city|payment/i.test(stringOrDateCols[0])) {
      return { chartType: 'pie', xAxis: stringOrDateCols[0], yAxis: numericCols[0] };
    }
    return { chartType: 'bar', xAxis: stringOrDateCols[0], yAxis: numericCols[0] };
  }

  return { chartType: 'table' };
}

// Initialize Database & Sample Data
async function initializeDatabase() {
  SQL = await initSqlJs();
  db = new SQL.Database();

  const { csvText, rows } = generateSyntheticRetailData();
  rawSampleCsv = csvText;

  registerDataset(
    'sample-sales',
    'Synthetic Retail Sales Dataset',
    'sample_sales',
    true,
    '200 synthetic retail sales transactions across Indian metro cities, categories, order statuses, and price points. Built for testing natural-language BI queries.',
    rows
  );

  console.log('BizLens AI: SQLite and Sample Dataset initialized successfully.');
}

// REST API Routes

// 1. List available datasets
app.get('/api/datasets', (req: Request, res: Response) => {
  const list = Array.from(datasets.values());
  res.json({ datasets: list });
});

// 2. Download sample CSV
app.get('/api/sample-csv', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="synthetic_retail_sales.csv"');
  res.send(rawSampleCsv);
});

// 3. Upload custom CSV
app.post('/api/upload-csv', (req: Request, res: Response) => {
  try {
    const { csvData, fileName, datasetName } = req.body;
    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid CSV data payload.' });
    }

    const parseResult = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
    });

    if (parseResult.errors && parseResult.errors.length > 0 && (!parseResult.data || parseResult.data.length === 0)) {
      return res.status(400).json({
        error: `Failed to parse CSV: ${parseResult.errors[0].message} at row ${parseResult.errors[0].row || 1}`,
      });
    }

    const rows = parseResult.data as Record<string, any>[];
    if (rows.length === 0) {
      return res.status(400).json({ error: 'The uploaded CSV file contains no data rows.' });
    }

    const id = `user-csv-${Date.now()}`;
    const name = datasetName?.trim() || fileName?.replace(/\.csv$/i, '') || 'Uploaded Business Data';
    const tableName = `custom_sales_${Date.now()}`;

    const metadata = registerDataset(
      id,
      name,
      tableName,
      false,
      `User-uploaded dataset with ${rows.length} rows and ${Object.keys(rows[0]).length} columns.`,
      rows
    );

    res.json({ success: true, dataset: metadata });
  } catch (err: any) {
    console.error('Error in upload-csv:', err);
    res.status(500).json({ error: err.message || 'Failed to process CSV file.' });
  }
});

// 4. Natural language to SQL query & insight generation
app.post('/api/query', async (req: Request, res: Response) => {
  try {
    const { question, datasetId, history } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid question.' });
    }

    const targetDatasetId = datasetId || 'sample-sales';
    const dataset = datasets.get(targetDatasetId);
    if (!dataset) {
      return res.status(404).json({ error: `Dataset with ID "${targetDatasetId}" was not found.` });
    }

    // Prepare table schema description for Gemini
    const columnsDescription = dataset.columns
      .map((c) => `- "${c.name}" (${c.type}): samples [${c.sampleValues.slice(0, 3).map((v) => JSON.stringify(v)).join(', ')}]`)
      .join('\n');

    const conversationContext = Array.isArray(history) && history.length > 0
      ? `Recent Conversation Context:\n${history
          .slice(-4)
          .map((h: any) => `${h.role === 'user' ? 'User Question' : 'Generated SQL'}: ${h.content}`)
          .join('\n')}\n`
      : '';

    const sqlPrompt = `You are BizLens AI, an expert analytical SQL engineer.
Your task is to convert the user's natural language business question into a single, highly accurate, read-only SQLite SQL query.

DATABASE SCHEMA:
Table Name: "${dataset.tableName}"
Columns:
${columnsDescription}

${conversationContext}
USER QUESTION: "${question}"

STRICT GUIDELINES:
1. Generate standard SQLite syntax only.
2. The query MUST strictly query from table "${dataset.tableName}".
3. Only use read-only SELECT statements (or WITH ... SELECT). NEVER use INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, or PRAGMA.
4. If the user asks for sales or revenue, use column "total_amount" if present, or "quantity * unit_price".
5. Handle case-insensitivity where appropriate (e.g., using LIKE or LOWER(city) = 'hyderabad').
6. For questions like "Compare sales by city", aggregate properly with SUM(total_amount) AS total_sales, COUNT(*) AS order_count, GROUP BY city, ORDER BY total_sales DESC.
7. For follow-up questions (e.g. "Now show Hyderabad only"), use the recent conversation context to refine or filter the query appropriately.
8. If the user asks for profit, margin, or metrics not present in the columns, do NOT hallucinate them. Calculate what is available or state limitations.
9. Format numbers cleanly (e.g. ROUND(..., 2) for currency amounts).
10. Return ONLY the raw SQL string inside a \`\`\`sql code block, with no conversational preamble.`;

    let candidateSql: string | null = null;
    let engineUsed: 'gemini' | 'analytical' = 'analytical';

    try {
      const sqlGenResponse = await generateContentWithRetry({
        model: 'gemini-3.8-flash',
        contents: sqlPrompt,
      });

      if (sqlGenResponse?.text) {
        const rawSqlResponse = sqlGenResponse.text;
        const sqlMatch = rawSqlResponse.match(/```(?:sql)?\s*([\s\S]*?)\s*```/i);
        const extracted = sqlMatch ? sqlMatch[1].trim() : rawSqlResponse.trim();
        if (extracted) {
          candidateSql = extracted;
          engineUsed = 'gemini';
        }
      }
    } catch {
      // Fallback cleanly without console spam
    }

    if (!candidateSql) {
      candidateSql = generateAnalyticalSql(question, dataset, history);
      engineUsed = 'analytical';
    }

    if (!candidateSql) {
      const colList = dataset.columns.map((c) => c.name).join(', ');
      return res.status(400).json({
        status: 'unsupported_question',
        error: `BizLens AI could not determine how to answer "${question}" from the available dataset columns. Available fields in "${dataset.name}" are: ${colList}. Please ask a specific business question such as "Compare sales by city" or "Top 5 products by revenue".`,
        apiStatus: {
          category: lastApiErrorCategory,
          message: lastApiErrorMessage,
        },
      });
    }

    // Validate the generated SQL
    let validation = validateSQL(candidateSql, dataset.tableName);
    if (!validation.valid || !validation.cleanSql) {
      const fallbackSql = generateAnalyticalSql(question, dataset, history);
      if (fallbackSql) {
        candidateSql = fallbackSql;
        validation = validateSQL(candidateSql, dataset.tableName);
        engineUsed = 'analytical';
      }
    }

    if (!validation.valid || !validation.cleanSql) {
      return res.status(400).json({
        status: 'invalid_sql',
        error: validation.error || 'The query could not be validated for read-only execution.',
        apiStatus: {
          category: lastApiErrorCategory,
          message: lastApiErrorMessage,
        },
      });
    }

    const executedSql = validation.cleanSql;

    // Execute SQL query in SQLite WASM engine
    let queryResult;
    try {
      queryResult = executeSqlSafely(executedSql);
    } catch (sqlErr: any) {
      return res.status(400).json({
        status: 'sql_error',
        error: `SQL Execution Error: ${sqlErr.message || 'Syntax error in generated SQL.'}`,
        sql: executedSql,
        apiStatus: {
          category: lastApiErrorCategory,
          message: lastApiErrorMessage,
        },
      });
    }

    const { columns, rows, executionTimeMs } = queryResult;

    // Suggest chart type
    const chartConfig = suggestChartType(columns, rows);

    // Generate grounded business insight explanation
    let spokenExplanation = '';
    let keyTakeaways: string[] = [];
    let followUps: string[] = [];

    if (engineUsed === 'gemini') {
      try {
        const sampleResultsJson = JSON.stringify(rows.slice(0, 15));
        const explanationPrompt = `You are BizLens AI's executive voice assistant.
Generate a concise, high-impact business answer (2-4 sentences max) grounded STRICTLY in the real database query results below.

Question: "${question}"
Executed SQL: ${executedSql}
Total Rows Returned: ${rows.length}
Result Data (sample): ${sampleResultsJson}

CRITICAL RULES:
1. State the exact figures, top performers, or key trends directly from the result data.
2. Never invent numbers, estimations, or figures not in the data.
3. If the result is empty, clearly explain that no records matched the criteria.
4. Keep the wording clear and punchy so it sounds natural when spoken aloud via Text-to-Speech.
5. Provide 2-3 logical short follow-up questions the business owner could ask next.
Format your response as valid JSON with keys:
"spokenExplanation": "Concise 2-4 sentence voice-friendly summary",
"keyTakeaways": ["Key bullet 1", "Key bullet 2"],
"followUps": ["Suggested question 1", "Suggested question 2", "Suggested question 3"]`;

        const explainRes = await generateContentWithRetry({
          model: 'gemini-3.8-flash',
          contents: explanationPrompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (explainRes?.text) {
          const parsedInsight = JSON.parse(explainRes.text || '{}');
          if (parsedInsight.spokenExplanation) {
            spokenExplanation = parsedInsight.spokenExplanation;
          }
          if (Array.isArray(parsedInsight.keyTakeaways)) {
            keyTakeaways = parsedInsight.keyTakeaways;
          }
          if (Array.isArray(parsedInsight.followUps)) {
            followUps = parsedInsight.followUps;
          }
        }
      } catch {
        // Fallback below
      }
    }

    if (!spokenExplanation) {
      const fallbackInsight = generateGroundedFallbackInsight(rows, columns, question, dataset.name, executedSql);
      spokenExplanation = fallbackInsight.spokenExplanation;
      keyTakeaways = fallbackInsight.keyTakeaways;
      followUps = fallbackInsight.followUps;
    }

    res.json({
      sql: executedSql,
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs,
      spokenExplanation,
      keyTakeaways,
      followUps,
      chartConfig,
      engine: engineUsed,
      isQuotaExhausted: isGeminiQuotaExhausted,
      apiStatus: {
        category: lastApiErrorCategory,
        message: lastApiErrorMessage,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/query:', err);
    res.status(500).json({ error: err.message || 'An unexpected error occurred while processing your query.' });
  }
});

// 5. Direct SQL execution for user-edited queries
app.post('/api/execute-sql', (req: Request, res: Response) => {
  try {
    const { sql, datasetId } = req.body;
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid SQL query.' });
    }

    const targetDatasetId = datasetId || 'sample-sales';
    const dataset = datasets.get(targetDatasetId);
    if (!dataset) {
      return res.status(404).json({ error: `Dataset with ID "${targetDatasetId}" was not found.` });
    }

    const validation = validateSQL(sql, dataset.tableName);
    if (!validation.valid || !validation.cleanSql) {
      return res.status(400).json({ error: validation.error || 'SQL query validation failed.' });
    }

    const queryResult = executeSqlSafely(validation.cleanSql);
    const chartConfig = suggestChartType(queryResult.columns, queryResult.rows);

    res.json({
      sql: validation.cleanSql,
      columns: queryResult.columns,
      rows: queryResult.rows,
      rowCount: queryResult.rows.length,
      executionTimeMs: queryResult.executionTimeMs,
      spokenExplanation: `Direct SQL execution complete. Returned ${queryResult.rows.length} rows in ${queryResult.executionTimeMs}ms.`,
      chartConfig,
    });
  } catch (err: any) {
    console.error('Error in execute-sql:', err);
    res.status(400).json({ error: err.message || 'Failed to execute SQL query.' });
  }
});

// Start server with Vite middleware in dev or static files in production
async function startServer() {
  await initializeDatabase();

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BizLens AI server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
