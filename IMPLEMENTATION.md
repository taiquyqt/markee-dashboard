# Markee AI Ops CEO Dashboard - Next.js Version

## 📋 Giới thiệu

Dashboard CEO Markee AI Ops đã được chuyển đổi từ HTML tĩnh sang **Next.js 16** với **React 19** và **Tailwind CSS 4**.

## 🏗️ Cấu trúc Dự án

```
app/
├── components/               # Các component React tái sử dụng
│   ├── Header.tsx           # Header với logo, period buttons, live indicator
│   ├── NavTabs.tsx          # Navigation tabs (Overview, Team, Cost, Skills)
│   ├── KPICard.tsx          # KPI card component
│   ├── TrendChart.tsx       # Biểu đồ xu hướng Token & Chi phí
│   ├── ToolChart.tsx        # Biểu đồ Doughnut - Phân bổ theo AI Tool
│   ├── TeamTable.tsx        # Bảng Team với 2 chế độ (preview & fullView)
│   ├── AlertBox.tsx         # Alert notification boxes
│   ├── TokenPool.tsx        # Token Pool Manager
│   ├── SkillLibrary.tsx     # Skill Library items
│   ├── DeptChart.tsx        # Bar chart - Adoption rate theo phòng ban
│   ├── RankChart.tsx        # Horizontal bar chart - Ranking năng suất
│   ├── CostHistChart.tsx    # Bar chart - Chi phí theo tháng
│   ├── CostDeptChart.tsx    # Pie chart - Chi phí theo phòng ban
│   └── ContribChart.tsx     # Bar chart - Đóng góp Skill Library
├── page.tsx                 # Main dashboard page (State management, routing)
├── globals.css              # Global styles + Tailwind imports
└── layout.tsx               # Root layout
```

## 🎯 Các Tính Năng

### 📊 Overview Tab
- 5 KPI cards hiển thị metrics chính
- 2 biểu đồ (Trend chart & Tool distribution)
- Bảng Team top 6 người
- Alert box cảnh báo
- Token Pool Manager

### 👥 Team Tab
- Bảng toàn bộ team (7 người) với đầy đủ metrics
- Bar chart - Adoption rate theo phòng ban
- Horizontal bar chart - Ranking năng suất AI

### 💰 Cost Tab
- 5 KPI cards về chi phí
- Bar chart - Lịch sử chi phí 6 tháng
- Pie chart - Chi phí theo phòng ban
- 3 suggestion cards cho tối ưu chi phí

### 💡 Skill Library Tab
- 2 skill list (Top prompts & SOP templates)
- Bar chart - Leaderboard đóng góp skill
- Recent experience sharing cards

## 🔧 Công Nghệ Sử Dụng

- **Next.js 16.2.6** - Framework React
- **React 19.2.4** - Library chính
- **Tailwind CSS 4** - Styling
- **Chart.js 4.5.1** - Charting library
- **react-chartjs-2 5.3.1** - React wrapper cho Chart.js
- **TypeScript 5** - Type safety

## 📦 Cài Đặt & Chạy

```bash
# Cài đặt dependencies
pnpm install

# Chạy development server
pnpm run dev

# Truy cập: http://localhost:3000
```

## 🎨 Design & Style

- **Color Scheme**: Dark theme (Slate-950 background)
- **Component Styling**: Tailwind CSS utility classes
- **Responsive**: Hỗ trợ responsive grid layout
- **Charts**: Dark mode compatible với Chart.js

## 💾 Dữ Liệu

Hiện tại, tất cả dữ liệu được hardcode trong components:
- `teamData` trong [TeamTable.tsx](app/components/TeamTable.tsx)
- `skillsData`, `sopData`, `experienceData` trong [page.tsx](app/page.tsx)

### Để tích hợp API thực tế:
1. Tạo folder `lib/api/`
2. Tạo các fetch functions
3. Thay thế hardcode data bằng API calls
4. Thêm error handling & loading states

## 🔌 State Management

Component sử dụng React hooks (useState) tại cấp page level:
- `activeTab` - Tab hiện tại
- `activePeriod` - Period filter (7d, 30d, 90d)

Có thể nâng cấp lên Context API hoặc Redux nếu cần global state.

## 📈 Phát Triển Tiếp Theo

- [ ] Tích hợp API backend thực tế
- [ ] Thêm authentication
- [ ] Implement real-time updates
- [ ] Thêm export to PDF/Excel
- [ ] Add dark/light mode toggle
- [ ] Mobile optimization
- [ ] Performance monitoring
- [ ] E2E testing

---

**Created with Next.js, React, Tailwind CSS & Chart.js**
