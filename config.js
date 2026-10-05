window.CONFIG = {
  // Link CSV của tab "jokes" trong Google Sheet (File > Chia sẻ > Xuất bản lên web > chọn tab jokes + CSV).
  // Để trống thì web dùng vài joke mẫu để bạn xem thử.
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTUcRemf5DZsmO6nutxwCJ0DvQbPnJI6p1oiIFhl_IxHjaQWDKVhy1cwuUk2MuapcnTUYdjnXbTWK1P/pub?gid=778888912&single=true&output=csv",

  // Link Web app của Google Apps Script (dùng để đếm reaction và xếp hạng).
  // Để trống thì ẩn số đếm và bảng xếp hạng.
  API_URL: "https://script.google.com/macros/s/AKfycbw-3Vrz2uHZhwkbJw5faSrSuk9oGl6RpmvBe15KP1NQFdYuUEKzUUQXmVzC2JQFVNta/exec",

  // Joke có cột date trong bao nhiêu ngày gần nhất thì hiện huy hiệu "Mới" (cột date không bắt buộc).
  NEW_DAYS: 7,

  // Số thẻ tối đa trên mỗi trang.
  PAGE_SIZE: 18,

  // Bảng xếp hạng hiện tối đa bao nhiêu joke (mỗi loại haha, lạy luôn).
  RANK_SIZE: 10,

  // Số thẻ trên mỗi trang của khung "Đã lưu".
  SAVED_SIZE: 10
};
