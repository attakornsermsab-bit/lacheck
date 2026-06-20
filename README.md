# Portfolio Monitor

Dashboard สำหรับติดตามพอร์ต 100M THB จากภาพ โดยใช้วันที่ซื้อ/ฐานราคา `2026-06-12`
และ refresh ข้อมูลใหม่ทุกครั้งที่เปิดหน้า รวมถึงทุก 5 นาทีระหว่างเปิดดู

## เปิดใช้งาน

ดับเบิลคลิก `Open_Portfolio_Monitor.cmd`

หรือถ้าเครื่องมี Node.js:

```powershell
npm start
```

หรือรันด้วย Node runtime ที่ Codex bundle มาให้:

```powershell
& "C:\Users\attakser\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.js
```

แล้วเปิด URL ที่แสดงในหน้าต่าง terminal เช่น `http://localhost:8787`

## อัปโหลดขึ้น GitHub

อัปโหลดไฟล์เหล่านี้เป็น root ของ repository:

- `server.js`
- `index.html`
- `styles.css`
- `app.js`
- `package.json`
- `Open_Portfolio_Monitor.cmd`
- `.gitignore`
- `README.md`

ไม่ต้องอัปโหลด `monitor-url.txt`, `server.log`, `server.err.log`

> หมายเหตุ: GitHub Pages แบบ static จะรัน `server.js` ไม่ได้ เพราะ dashboard ต้องมี backend เล็ก ๆ เพื่อดึงราคาและหลบปัญหา CORS. ถ้าจะให้ใช้งานออนไลน์จริง ควร deploy เป็น Node service หรือ Cloudflare Worker/Pages Functions.

## แหล่งข้อมูล

- Yahoo Finance chart data: NVDA, SNDK, LLY, MU, GULF.BK, USDTHB=X
- Finnomena public fund NAV: KASF, KTFIXPLUS-X, SCBGOLD, SCBOIL
- KKP SAVVY: นับเป็นเงินสด/บัญชีฝากคงที่ เพราะไม่มี NAV feed ในภาพ

## หมายเหตุการตรวจราคาในภาพ

Dashboard ใช้ราคาปิด official วันที่ `2026-06-12` เป็นฐานคำนวณผลตอบแทน
และแสดงสถานะ `ตรง` / `ไม่ตรง` ในตาราง Holdings
