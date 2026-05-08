# Google Apps Script untuk Legiy Dessert POS (Dynamic Backend)

Karena aplikasi POS dibuat di sisi frontend, integrasi dengan Google Sheets akan bertindak sebagai "database" fleksibel yang mana struktur tabel dan halamannya (sheet) dibuat secara otomatis berdasarkan data (kebutuhan) aplikasi.

Ikuti langkah-langkah di bawah ini untuk men-deploy backend pintar Google Apps Script!

## 1. Buat Spreadsheet Baru
1. Buka [Google Sheets](https://sheets.google.com).
2. Buat Spreadsheet kosong baru (misal dengan nama "Legiy Dessert Data").
3. Anda tidak perlu membuat tab/sheet secara manual. Semua tab akan **dihasilkan secara otomatis** oleh script setiap kali Anda mengirimkan data. (contoh: ORDER, PRODUCT, EXPENSE, dll.).

## 2. Buka Google Apps Script
1. Dari Google Sheet tersebut, klik menu **Extensions** > **Apps Script** (atau Ekstensi > Apps Script).
2. Akan terbuka tab/halaman baru. Ganti nama "Untitled project" di sebelah kiri atas menjadi "Legiy Dessert Dynamic Backend".

## 3. Copy Paste Kode Backend
Hapus template fungsi `myFunction()` yang ada, dan paste kode `Code.gs` di bawah ini seluruhnya:

```javascript
function doPost(e) {
  try {
    var rawData = e.postData.contents;
    
    // Parse JSON dari input
    var dataObj = JSON.parse(rawData);
    var sheetName = dataObj.type; // Nama sheet diambil otomatis dari input 'type'
    var action = dataObj.action || "UPSERT"; // Menandakan operasi "UPSERT" atau "DELETE"
    var payloadData = dataObj.data; // Data sesungguhnya dari UI
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    // 1. Auto-Create Sheet jikalau belum ada di Database (Misal: ORDER, PRODUCT)
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // 2. Auto-Generate & Auto-Update Column Headers
    var headers = [];
    if (sheet.getLastRow() === 0) {
      // Sheetnya baru/kosong, buat Header dari keys milik Object Payload
      headers = Object.keys(payloadData);
      if (headers.length > 0) {
        sheet.appendRow(headers);
      }
    } else {
      // Kalau sudah ada isinya, baca header yg sudah tersedia
      headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      
      // Auto-Add kolom baru apabila ada "kebutuhan aplikasi baru" tanpa modif hardcode!
      var hasNewHeaders = false;
      var payloadKeys = Object.keys(payloadData);
      for (var k = 0; k < payloadKeys.length; k++) {
        if (headers.indexOf(payloadKeys[k]) === -1) {
          headers.push(payloadKeys[k]);
          hasNewHeaders = true;
        }
      }
      
      if (hasNewHeaders) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }
    
    // 3. FITUR DELETE DATA
    if (action === "DELETE") {
       var dataRange = sheet.getDataRange().getValues();
       var idColumnIndex = headers.indexOf("id") > -1 ? headers.indexOf("id") : headers.indexOf("orderId");
       
       if (idColumnIndex > -1) {
         for (var i = 1; i < dataRange.length; i++) {
           if (dataRange[i][idColumnIndex] == (payloadData.id || payloadData.orderId)) {
             sheet.deleteRow(i + 1); // delete record
             break;
           }
         }
       }
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 4. FITUR UPSERT (UPDATE JIKA ADA, INSERT JIKA BARU)
    // Susun array berisi values berurutan sesuai kolom yang ada di Header saat ini
    var rowData = [];
    for (var h = 0; h < headers.length; h++) {
      var key = headers[h];
      var val = payloadData[key];
      // Jadikan string kalau wujudnya array/object (misal snapshot dari daftar belanja keranjang)
      if (typeof val === 'object' && val !== null) {
        rowData.push(JSON.stringify(val));
      } else {
        rowData.push(val !== undefined ? val : "");
      }
    }
    
    // Temukan Row ID (Apakah id sudah pernah dimasukkan atau belum?)
    var primaryKey = payloadData.id || payloadData.orderId;
    var foundRow = -1;
    
    if (primaryKey && sheet.getLastRow() > 1) {
       var dataRange = sheet.getDataRange().getValues();
       var idColumnIndex = headers.indexOf("id") > -1 ? headers.indexOf("id") : (headers.indexOf("orderId") > -1 ? headers.indexOf("orderId") : -1);
       
       if (idColumnIndex > -1) {
         for (var i = 1; i < dataRange.length; i++) {
           if (dataRange[i][idColumnIndex] == primaryKey) {
             foundRow = i + 1;
             break;
           }
         }
       }
    }
    
    if (foundRow > -1) {
      // Apabila id sudah tersedia: Timpa dan modifikasi data yang lama
      sheet.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      // Apabila id belum ada: Tambahkan jadi deretan data yang baru
      sheet.appendRow(rowData);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var result = {};

    // Ambil data untuk spesifik sheet jika diminta, jika tidak semua
    var requestedSheet = e.parameter.type;
    
    for (var s = 0; s < sheets.length; s++) {
      var sheet = sheets[s];
      var sheetName = sheet.getName();
      
      if (requestedSheet && sheetName !== requestedSheet) continue;

      if (sheet.getLastRow() > 1) {
        var dataRange = sheet.getDataRange().getValues();
        var headers = dataRange[0];
        var data = [];

        for (var i = 1; i < dataRange.length; i++) {
          var row = dataRange[i];
          var obj = {};
          for (var j = 0; j < headers.length; j++) {
            var value = row[j];
            // Coba parse json apabial string
            if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
              try {
                value = JSON.parse(value);
              } catch (err) {}
            }
            obj[headers[j]] = value;
          }
          data.push(obj);
        }
        result[sheetName] = data;
      } else {
        result[sheetName] = [];
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

## 4. Deploy sebagai Web App
1. Klik tombol biru **Deploy** di pojok kanan atas layar.
2. Pilih **New deployment** (Deployment Baru).
3. Klik icon gear ⚙️ disamping tulisan "Select type" (Pilih tipe konfigurasi), lalu centang **Web app**.
4. Isi kotak deskripsi secara bebas (misalnya "Legiy POS Dynamic Backend Auto").
5. Di bagian **Execute as** (Jalankan sebagai), pilih **Me (Alamat email Anda)**.
6. Di kotak **Who has access** (Siapa yang memiliki akses), PASTI-KAN memilih **Anyone / Siapa saja** (Penting! Jika tidak diaplikasi tidak punya izin menulis ke spreadsheet anda).
7. Klik tombol biru **Deploy**.
8. Minta Otorisasi (Authorize access) jika muncul peringatan. Pilih akun Google Anda > klik 'Advanced...' > 'Go to Legiy Dessert Dynamic Backend (unsafe)' > Allow (Izinkan akses).
9. **Copy Web App URL** yang dihasilkan di akhir proses deployment.

## 5. Hubungkan Ulang (Link) di Sisi Frontend
Buka file `src/googleSheetsService.ts`, jangan lupa perbarui _string variable_ `SCRIPT_URL` dengan **Web App URL** terbaru yang disalin tadi. 

Mulai saat ini setiap kali bentuk strukur data baru dikenalkan di masa yang akan datang, seperti "DISCOUNT", "VOUCHER", atau menambahkan fitur kolom kategori produk terbaru, Google Sheet secara otomatis akan menganalisa serta menambahkan tab dan header kolom perubahannya ke spreadsheet Anda tanpa menulis script yang sangat panjang!
