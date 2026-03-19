let codeReader;
let scanning = false;

document.getElementById('scanBtn').addEventListener('click', startScan);
document.getElementById('stopScanBtn').addEventListener('click', stopScan);
document.getElementById('barcode').addEventListener('blur', checkProduct);
document.getElementById('stockInForm').addEventListener('submit', handleStockIn);

async function startScan() {
  try {
    codeReader = new ZXing.BrowserMultiFormatReader();
    document.getElementById('video-container').style.display = 'block';
    scanning = true;

    const result = await codeReader.decodeFromVideoDevice(undefined, 'video', (result, err) => {
      if (result && scanning) {
        document.getElementById('barcode').value = result.text;
        stopScan();
        checkProduct();
      }
    });
  } catch (err) {
    showMessage('摄像头访问失败，请手动输入条码或使用HTTPS访问', 'danger');
    document.getElementById('video-container').style.display = 'none';
  }
}

function stopScan() {
  if (codeReader) {
    codeReader.reset();
  }
  scanning = false;
  document.getElementById('video-container').style.display = 'none';
}

async function checkProduct() {
  const barcode = document.getElementById('barcode').value.trim();
  if (!barcode) return;

  try {
    const res = await fetch(`/api/product/${barcode}`);
    const product = await res.json();

    if (product) {
      document.getElementById('name').value = product.name;
      document.getElementById('type').value = product.type;
      document.getElementById('specification').value = product.specification || '';
      document.getElementById('production_date').value = product.production_date;
      document.getElementById('expiry_date').value = product.expiry_date;
    }
  } catch (err) {
    console.error('查询产品失败:', err);
  }
}

async function handleStockIn(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  try {
    const res = await fetch('/api/stock-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (res.ok) {
      showMessage('入库成功！当前库存：' + result.stock, 'success');
      e.target.reset();
    } else {
      showMessage('入库失败：' + result.error, 'danger');
    }
  } catch (err) {
    showMessage('网络错误，请重试', 'danger');
  }
}

function showMessage(text, type) {
  const messageEl = document.getElementById('message');
  messageEl.innerHTML = `<div class="alert alert-${type}">${text}</div>`;
  setTimeout(() => {
    messageEl.innerHTML = '';
  }, 3000);
}
