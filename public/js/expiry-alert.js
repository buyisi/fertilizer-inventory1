function getDaysRemaining(expiryDate) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

async function loadExpiryAlert() {
  try {
    const res = await fetch('/api/expiry-alert');
    const products = await res.json();

    const alertList = document.getElementById('alertList');
    const tableBody = document.getElementById('expiryTable');

    if (products.length === 0) {
      alertList.innerHTML = '<div class="alert alert-success">✅ 暂无即将过期的产品</div>';
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">暂无数据</td></tr>';
      return;
    }

    alertList.innerHTML = `<div class="alert alert-warning">⚠️ 发现 ${products.length} 个即将过期的产品，请及时处理</div>`;
    tableBody.innerHTML = '';

    products.forEach(product => {
      const daysRemaining = getDaysRemaining(product.expiry_date);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${product.barcode}</td>
        <td>${product.name}</td>
        <td>${product.type}</td>
        <td>${product.expiry_date}</td>
        <td><span style="color: ${daysRemaining <= 7 ? '#e74c3c' : '#f39c12'};">${daysRemaining} 天</span></td>
        <td>${product.stock}</td>
      `;
      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error('加载过期提醒失败:', err);
  }
}

// 页面加载时自动加载
document.addEventListener('DOMContentLoaded', loadExpiryAlert);
