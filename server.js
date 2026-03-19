const express = require('express');
const bodyParser = require('body-parser');
const moment = require('moment');
const db = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 页面路由
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/stock-in', (req, res) => {
  res.render('stock-in');
});

app.get('/stock-out', (req, res) => {
  res.render('stock-out');
});

app.get('/inventory', (req, res) => {
  res.render('inventory');
});

app.get('/expiry-alert', (req, res) => {
  res.render('expiry-alert');
});

// API接口
// 根据条码查询产品
app.get('/api/product/:barcode', (req, res) => {
  try {
    const { barcode } = req.params;
    const row = db.prepare('SELECT * FROM products WHERE barcode = ?').get(barcode);
    res.json(row || null);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 入库
app.post('/api/stock-in', (req, res) => {
  try {
    const { barcode, name, type, specification, production_date, expiry_date, quantity } = req.body;
    const product = db.prepare('SELECT * FROM products WHERE barcode = ?').get(barcode);
    const qty = parseInt(quantity);

    if (product) {
      // 产品已存在，更新库存
      const newStock = product.stock + qty;
      db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, product.id);
      // 记录入库记录
      db.prepare('INSERT INTO stock_records (product_id, type, quantity) VALUES (?, ?, ?)').run(product.id, 'in', qty);
      res.json({ success: true, stock: newStock });
    } else {
      // 新产品，插入
      const stmt = db.prepare('INSERT INTO products (barcode, name, type, specification, production_date, expiry_date, stock) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const result = stmt.run(barcode, name, type, specification, production_date, expiry_date, qty);
      // 记录入库记录
      db.prepare('INSERT INTO stock_records (product_id, type, quantity) VALUES (?, ?, ?)').run(result.lastInsertRowid, 'in', qty);
      res.json({ success: true, id: result.lastInsertRowid });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 出库
app.post('/api/stock-out', (req, res) => {
  try {
    const { barcode, quantity } = req.body;
    const product = db.prepare('SELECT * FROM products WHERE barcode = ?').get(barcode);
    const qty = parseInt(quantity);

    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }

    if (product.stock < qty) {
      return res.status(400).json({ error: '库存不足' });
    }

    const newStock = product.stock - qty;
    db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, product.id);
    // 记录出库记录
    db.prepare('INSERT INTO stock_records (product_id, type, quantity) VALUES (?, ?, ?)').run(product.id, 'out', qty);
    res.json({ success: true, stock: newStock });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 获取库存列表
app.get('/api/inventory', (req, res) => {
  try {
    const { type } = req.query;
    let sql = 'SELECT * FROM products WHERE stock > 0';
    let params = [];
    if (type && type !== 'all') {
      sql += ' AND type = ?';
      params.push(type);
    }
    sql += ' ORDER BY updated_at DESC';

    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 获取即将过期产品（30天内）
app.get('/api/expiry-alert', (req, res) => {
  try {
    const today = moment().format('YYYY-MM-DD');
    const thirtyDaysLater = moment().add(30, 'days').format('YYYY-MM-DD');

    const rows = db.prepare('SELECT * FROM products WHERE expiry_date BETWEEN ? AND ? AND stock > 0 ORDER BY expiry_date ASC')
      .all(today, thirtyDaysLater);
    res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
