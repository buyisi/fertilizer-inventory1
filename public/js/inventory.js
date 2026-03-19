document.getElementById('typeFilter').addEventListener('change', loadInventory);
document.getElementById('refreshBtn').addEventListener('click', loadInventory);

async function loadInventory() {
  const type = document.getElementById('typeFilter').value;

  try {
    const res = await fetch(`/api/inventory?type=${type}`);
    const products = await res.json();

    const tableBody = document.getElementById('inventoryTable');
    tableBody.innerHTML = '';

    if (products.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">暂无库存数据</td></tr>';
      return;
    }

    products.forEach(product => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${product.barcode}</td>
        <td>${product.name}</td>
        <td>${product.type}</td>
        <td>${product.specification || '-'}</td>
        <td>${product.production_date}</td>
        <td>${product.expiry_date}</td>
        <td>${product.stock}</td>
      `;
      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error('加载库存失败:', err);
  }
}

// 页面加载时自动加载库存
document.addEventListener('DOMContentLoaded', loadInventory);
