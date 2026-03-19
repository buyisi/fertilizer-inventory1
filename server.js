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
  const { barcode } = req.params;
  db.get('SELECT * FROM products WHERE barcode = ?', [barcode], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(row || null);
  });
});

// 入库
app.post('/api/stock-in', (req, res) => {
  const { barcode, name, type, specification, production_date, expiry_date, quantity } = req.body;

  db.get('SELECT * FROM products WHERE barcode = ?', [barcode], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (product) {
      // 产品已存在，更新库存
      const newStock = product.stock + parseInt(quantity);
      db.run('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStock, product.id], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        // 记录入库记录
        db.run('INSERT INTO stock_records (product_id, type, quantity) VALUES (?, ?, ?)', [product.id, 'in', quantity], (err) => {
          if (err) console.error('记录入库失败:', err);
        });
        res.json({ success: true, stock: newStock });
      });
    } else {
      // 新产品，插入
      db.run('INSERT INTO products (barcode, name, type, specification, production_date, expiry_date, stock) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [barcode, name, type, specification, production_date, expiry_date, parseInt(quantity)],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          // 记录入库记录
          db.run('INSERT INTO stock_records (product_id, type, quantity) VALUES (?, ?, ?)', [this.lastID, 'in', quantity], (err) => {
            if (err) console.error('记录入库失败:', err);
          });
          res.json({ success: true, id: this.lastID });
        }
      );
    }
  });
});

// 出库
app.post('/api/stock-out', (req, res) => {
  const { barcode, quantity } = req.body;

  db.get('SELECT * FROM products WHERE barcode = ?', [barcode], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }

    if (product.stock < parseInt(quantity)) {
      return res.status(400).json({ error: '库存不足' });
    }

    const newStock = product.stock - parseInt(quantity);
    db.run('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStock, product.id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      // 记录出库记录
      db.run('INSERT INTO stock_records (product_id, type, quantity) VALUES (?, ?, ?)', [product.id, 'out', quantity], (err) => {
        if (err) console.error('记录出库失败:', err);
      });
      res.json({ success: true, stock: newStock });
    });
  });
});

// 获取库存列表
app.get('/api/inventory', (req, res) => {
  const { type } = req.query;
  let sql = 'SELECT * FROM products WHERE stock > 0';
  let params = [];
  if (type && type !== 'all') {
    sql += ' AND type = ?';
    params.push(type);
  }
  sql += ' ORDER BY updated_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 获取即将过期产品（30天内）
app.get('/api/expiry-alert', (req, res) => {
  const today = moment().format('YYYY-MM-DD');
  const thirtyDaysLater = moment().add(30, 'days').format('YYYY-MM-DD');

  db.all('SELECT * FROM products WHERE expiry_date BETWEEN ? AND ? AND stock > 0 ORDER BY expiry_date ASC',
    [today, thirtyDaysLater],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
