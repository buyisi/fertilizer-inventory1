const { Pool } = require('pg');

// 直接配置Supabase连接字符串
const pool = new Pool({
  connectionString: 'postgresql://postgres:pandd6143306@db.ukecsklftzkffcvwbgdl.supabase.co:5432/postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

// 测试连接
pool.connect((err, client, release) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('已成功连接到Supabase PostgreSQL数据库');
    release();
  }
});

module.exports = pool;
