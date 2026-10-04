// Dán vào Google Sheet: Tiện ích mở rộng > Apps Script.
// Triển khai: Triển khai > Triển khai mới > Ứng dụng web
//   Thực thi với tư cách: Tôi | Người có quyền truy cập: Bất kỳ ai
// Copy link Web app dán vào API_URL trong config.js.
// Tab "reactions" tự tạo ở lần chạy đầu tiên.

var SHEET_NAME = 'reactions';

function doGet(e) {
  var p = (e && e.parameter) || {};
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['id', 'haha', 'lay']);
  }

  if (p.action === 'react') {
    var type = p.type === 'haha' ? 'haha' : (p.type === 'lay' ? 'lay' : null);
    if (!type || !p.id) return out({ ok: false });
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var data = sh.getDataRange().getValues();
      var col = type === 'haha' ? 2 : 3;
      var row = -1;
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(p.id)) { row = i + 1; break; }
      }
      if (row < 0) {
        sh.appendRow([p.id, 0, 0]);
        row = sh.getLastRow();
      }
      var cell = sh.getRange(row, col);
      cell.setValue((Number(cell.getValue()) || 0) + 1);
      // Người xem đổi từ lựa chọn cũ sang lựa chọn mới: trừ 1 ở lựa chọn cũ (không xuống dưới 0).
      var prev = p.prev === 'haha' ? 'haha' : (p.prev === 'lay' ? 'lay' : null);
      if (prev && prev !== type) {
        var pcell = sh.getRange(row, prev === 'haha' ? 2 : 3);
        pcell.setValue(Math.max(0, (Number(pcell.getValue()) || 0) - 1));
      }
    } finally {
      lock.releaseLock();
    }
    return out({ ok: true });
  }

  var rows = sh.getDataRange().getValues();
  var res = {};
  for (var k = 1; k < rows.length; k++) {
    res[rows[k][0]] = { haha: Number(rows[k][1]) || 0, lay: Number(rows[k][2]) || 0 };
  }
  return out(res);
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
