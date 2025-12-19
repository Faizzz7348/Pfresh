import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Languages, Trash2, Copy, Check, Sparkles, Download, Moon, Sun } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isMarkdown?: boolean;
}

interface HelpChatbotProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Language = 'en' | 'ms' | 'ta' | 'zh';

// Language detection with improved patterns
const detectLanguage = (text: string): Language | null => {
  const lower = text.toLowerCase();
  
  // Tamil detection
  if (lower.includes('tamil') || lower.includes('speak tamil') || /[\u0B80-\u0BFF]/.test(text)) {
    return 'ta';
  }
  
  // Malay detection
  if (lower.includes('malay') || lower.includes('bahasa') || lower.includes('speak malay') || lower.includes('cakap melayu')) {
    return 'ms';
  }

  // Chinese detection
  if (lower.includes('chinese') || lower.includes('mandarin') || /[\u4E00-\u9FFF]/.test(text)) {
    return 'zh';
  }
  
  // English detection
  if (lower.includes('english') || lower.includes('speak english')) {
    return 'en';
  }
  
  return null;
};

// Multi-language responses with enhanced content
const languageResponses = {
  en: {
    welcome: "👋 Hi! I'm your **Route4VM AI Assistant**. I'm here to help you navigate and use this route management system efficiently!\n\nYou can ask me about:\n🚀 Features & capabilities\n📝 How to use specific functions\n🔧 Troubleshooting\n💡 Tips & best practices\n\nJust type your question!",
    languageChanged: "✓ Language changed to **English**. How can I assist you today?",
    cleared: "🗑️ Chat history cleared!",
    copied: "📋 Message copied to clipboard!"
  },
  ms: {
    welcome: "👋 Hai! Saya **Pembantu AI Route4VM**. Saya di sini untuk membantu anda menggunakan sistem pengurusan laluan ini dengan cekap!\n\nAnda boleh tanya saya tentang:\n🚀 Ciri-ciri & kemampuan\n📝 Cara guna fungsi tertentu\n🔧 Penyelesaian masalah\n💡 Tips & amalan terbaik\n\nTaip sahaja soalan anda!",
    languageChanged: "✓ Bahasa ditukar ke **Bahasa Melayu**. Apa yang boleh saya bantu?",
    cleared: "🗑️ Sejarah sembang dipadam!",
    copied: "📋 Mesej disalin ke clipboard!"
  },
  ta: {
    welcome: "👋 வணக்கம்! நான் உங்கள் **Route4VM AI உதவியாளர்**. இந்த பாதை மேலாண்மை அமைப்பை திறம்பட பயன்படுத்த உதவ இங்கு இருக்கிறேன்!\n\nநீங்கள் என்னிடம் கேட்கலாம்:\n🚀 அம்சங்கள் & திறன்கள்\n📝 குறிப்பிட்ட செயல்பாடுகளை எவ்வாறு பயன்படுத்துவது\n🔧 சிக்கல் தீர்வு\n💡 குறிப்புகள் & சிறந்த நடைமுறைகள்\n\nஉங்கள் கேள்வியை தட்டச்சு செய்யுங்கள்!",
    languageChanged: "✓ மொழி **தமிழ்** மாற்றப்பட்டது. நான் இன்று எவ்வாறு உதவ முடியும்?",
    cleared: "🗑️ அரட்டை வரலாறு அழிக்கப்பட்டது!",
    copied: "📋 செய்தி clipboard க்கு நகலெடுக்கப்பட்டது!"
  },
  zh: {
    welcome: "👋 你好！我是您的 **Route4VM AI 助手**。我在这里帮助您高效地使用这个路线管理系统！\n\n您可以问我：\n🚀 功能和能力\n📝 如何使用特定功能\n🔧 故障排除\n💡 提示和最佳实践\n\n请输入您的问题！",
    languageChanged: "✓ 语言已更改为**中文**。今天我能帮您什么？",
    cleared: "🗑️ 聊天记录已清除！",
    copied: "📋 消息已复制到剪贴板！"
  },
};

// Enhanced knowledge base with more comprehensive responses
const getResponse = (question: string, language: Language = 'en'): string => {
  const q = question.toLowerCase();
  
  // Language-specific responses
  const responses = {
    en: {
      editMode: "🔐 **Edit Mode Guide**\n\nTo enable Edit Mode:\n1️⃣ Click **Menu** (☰) button\n2️⃣ Select **'Edit Mode'**\n3️⃣ Enter your **password**\n4️⃣ Once authenticated, you can:\n   • ✏️ Edit cells inline\n   • 🔄 Drag & drop rows to reorder\n   • ➕ Add new rows\n   • ➖ Delete rows\n   • 📊 Add/remove columns\n   • 🖼️ Upload images\n   • 🎨 Customize marker colors\n\n💡 **Pro Tip**: All changes are automatically saved to the database!",
      
      drag: "🔄 **Reordering Rows**\n\n**Prerequisites**: Enable Edit Mode first\n\n**Steps**:\n1️⃣ Look for the **grip icon** (⋮⋮) on the left of each row\n2️⃣ **Click and hold** the grip icon\n3️⃣ **Drag** the row up or down\n4️⃣ **Release** to drop in the new position\n\n✅ Changes are **saved automatically**\n🚀 Optimized for smooth performance!",
      
      filter: "🔍 **Filtering & Search**\n\n**Search Box**:\n• Type anything to filter across **all columns**\n• Searches: Route, Location, Address, etc.\n\n**📍 Route Filter**:\n1️⃣ Click the **filter button**\n2️⃣ Select routes (KL 1, KL 2, SL 1...)\n3️⃣ Multiple selections allowed\n\n**🚚 Delivery Filter**:\n• Filter by type: Daily, Weekday, Alt 1, Alt 2\n\n**💡 Tip**: Active filters shown as badges. Click **'Clear All'** to reset!",
      
      column: "📊 **Column Customization**\n\n**Add Column** (Edit Mode):\n1️⃣ Menu → **'Add Column'**\n2️⃣ Choose column type:\n   • Text\n   • Number\n   • Currency (MYR)\n   • Select Options\n   • Images\n3️⃣ Enter column name\n4️⃣ Save\n\n**Show/Hide Columns**:\n• Click **'Customize'** button\n• Toggle columns on/off\n• Drag to reorder\n\n**💡 Pro Tip**: Custom columns are saved per user!",
      
      images: "🖼️ **Image Management**\n\n**Add Images** (Edit Mode):\n1️⃣ Click **image icon** in row\n2️⃣ Choose upload method:\n   • 📁 File upload\n   • 🔗 Image URL\n3️⃣ Add caption (optional)\n4️⃣ Save\n\n**View Images**:\n• Click thumbnail to open **lightbox**\n• Swipe/arrow keys to navigate\n• Full-screen viewing\n\n**💡 Features**:\n• Multiple images per location\n• Captions support\n• Lazy loading for performance",
      
      route: "🗺️ **Route Optimization**\n\n**How to Optimize**:\n1️⃣ Select locations (checkboxes)\n2️⃣ Menu → **'Optimize Route'**\n3️⃣ Review optimized sequence\n4️⃣ Apply if satisfied\n\n**Benefits**:\n• 📉 Minimize travel distance\n• ⏱️ Save time\n• ⛽ Reduce fuel costs\n• 🤖 AI-powered algorithms\n\n**💡 Tip**: Always includes QL Kitchen as starting point!",
      
      share: "🔗 **Sharing Tables**\n\n**Share Current View**:\n1️⃣ Click **'Share'** button\n2️⃣ Copy generated link\n3️⃣ Send to team members\n\n**Shared Link Includes**:\n• Current filters\n• Column visibility\n• Sort order\n• Page settings\n\n**Custom Tables**:\n• Create custom table with selected rows\n• Generate unique share link\n• Recipients see read-only view\n\n**💡 Secure**: Each link is unique and trackable!",
      
      bulk: "🎨 **Bulk Color Update**\n\n**Set Color by Route** (Edit Mode):\n1️⃣ Menu → **'Set Color by Route'**\n2️⃣ Select a route\n3️⃣ Choose color:\n   • Use color picker\n   • Enter hex code\n   • Select from presets\n4️⃣ Click **'Update'**\n\n**Result**: All locations on that route get the same marker color!\n\n**💡 Use Case**: Visually distinguish routes on map view",
      
      calendar: "📅 **Calendar Features**\n\n**Add Event**:\n1️⃣ Click on a date\n2️⃣ Enter event details:\n   • Title\n   • Start/End time\n   • Description\n3️⃣ Save\n\n**Edit/Delete**:\n• Click existing event\n• Modify or delete\n\n**Views**:\n• Month view\n• Week view\n• Day view\n\n**💡 Perfect for**: Scheduling delivery routes, planning maintenance, team events",
      
      custom: "📋 **Custom Tables**\n\n**Create Custom Table**:\n1️⃣ Select locations (checkboxes)\n2️⃣ Click **'Create Custom Table'**\n3️⃣ Enter name & description\n4️⃣ Save\n\n**Benefits**:\n• Group related locations\n• Create route-specific views\n• Share with team\n• Easy access from sidebar\n\n**Edit Custom Table**:\n• Click edit icon\n• Add/remove locations\n• Update details\n\n**💡 Use Case**: Create tables for different delivery schedules!",
      
      theme: "🎨 **Theme Settings**\n\n**Switch Theme**:\n• Click **theme toggle** button (☀️/🌙)\n• Instant switch between:\n  • ☀️ Light Mode\n  • 🌙 Dark Mode\n\n**Auto-Save**: Your preference is remembered!\n\n**💡 Tip**: Dark mode reduces eye strain during night shifts",
      
      pwa: "📱 **PWA (Progressive Web App)**\n\n**Install App**:\n• Chrome/Edge: Click install prompt\n• iOS Safari: Share → Add to Home Screen\n\n**Benefits**:\n✅ Works offline\n✅ Fast loading\n✅ Native app experience\n✅ No app store needed\n✅ Auto updates\n\n**Features**:\n• Push notifications\n• Background sync\n• Home screen icon\n\n**💡 Tip**: Install for quickest access!",
      
      shortcuts: "⌨️ **Keyboard Shortcuts**\n\n**Navigation**:\n• `Ctrl/Cmd + K` - Open search\n• `Esc` - Close modals\n• `Arrow Keys` - Navigate lightbox\n\n**Edit Mode**:\n• `Enter` - Edit cell\n• `Esc` - Cancel edit\n• `Tab` - Next cell\n\n**General**:\n• `Ctrl/Cmd + S` - Save (auto-saves anyway)\n• `Ctrl/Cmd + /` - Show shortcuts\n\n**💡 Pro Tip**: Master shortcuts for 10x productivity!",
      
      tips: "💡 **Pro Tips & Best Practices**\n\n**Performance**:\n• ⚡ Use filters to show only what you need\n• 🖼️ Lazy loading handles many images smoothly\n• 🔄 Drag optimizations prevent lag\n\n**Organization**:\n• 🎨 Use color coding for quick route identification\n• 📋 Create custom tables for different purposes\n• 📅 Use calendar for scheduling\n\n**Collaboration**:\n• 🔗 Share specific views with team members\n• 💬 Use descriptive names for custom tables\n• 📝 Add captions to images for context\n\n**Security**:\n• 🔐 Edit mode requires password\n• 🔒 Share links are unique and trackable\n\n**💡 Remember**: All changes are auto-saved!",
      
      default: "🤖 **How Can I Help?**\n\nI'm here to assist you! You can ask me about:\n\n**📚 Features**:\n• Edit Mode\n• Drag & Drop\n• Filters & Search\n• Column Customization\n• Image Management\n• Route Optimization\n• Sharing Tables\n• Custom Tables\n• Calendar\n• Bulk Color Updates\n• PWA Installation\n\n**🎯 Try asking**:\n• 'How to edit data?'\n• 'How to filter routes?'\n• 'How to add images?'\n• 'How to optimize route?'\n• 'How to share table?'\n• 'Show me keyboard shortcuts'\n• 'Give me pro tips'\n\n**💬 Or just ask naturally**: I understand context!"
    },
    ms: {
      editMode: "🔐 **Panduan Edit Mode**\n\nUntuk aktifkan Edit Mode:\n1️⃣ Klik butang **Menu** (☰)\n2️⃣ Pilih **'Edit Mode'**\n3️⃣ Masukkan **kata laluan**\n4️⃣ Selepas berjaya, anda boleh:\n   • ✏️ Edit sel secara terus\n   • 🔄 Drag & drop baris untuk susun semula\n   • ➕ Tambah baris baru\n   • ➖ Padam baris\n   • 📊 Tambah/buang kolum\n   • 🖼️ Muat naik gambar\n   • 🎨 Sesuaikan warna marker\n\n💡 **Pro Tip**: Semua perubahan disimpan secara automatik!",
      
      drag: "🔄 **Susun Semula Baris**\n\n**Prasyarat**: Aktifkan Edit Mode dahulu\n\n**Langkah**:\n1️⃣ Cari **ikon grip** (⋮⋮) di sebelah kiri setiap baris\n2️⃣ **Klik dan tahan** ikon grip\n3️⃣ **Drag** baris ke atas atau ke bawah\n4️⃣ **Lepaskan** untuk drop di posisi baru\n\n✅ Perubahan **disimpan automatik**\n🚀 Dioptimumkan untuk prestasi lancar!",
      
      filter: "🔍 **Penapis & Carian**\n\n**Kotak Carian**:\n• Taip apa-apa untuk tapis merentas **semua kolum**\n• Cari: Laluan, Lokasi, Alamat, dll.\n\n**📍 Penapis Laluan**:\n1️⃣ Klik **butang penapis**\n2️⃣ Pilih laluan (KL 1, KL 2, SL 1...)\n3️⃣ Boleh pilih berbilang\n\n**🚚 Penapis Penghantaran**:\n• Tapis mengikut jenis: Daily, Weekday, Alt 1, Alt 2\n\n**💡 Tip**: Penapis aktif ditunjukkan sebagai badge. Klik **'Clear All'** untuk reset!",
      
      column: "📊 **Penyesuaian Kolum**\n\n**Tambah Kolum** (Edit Mode):\n1️⃣ Menu → **'Add Column'**\n2️⃣ Pilih jenis kolum:\n   • Text\n   • Number\n   • Currency (MYR)\n   • Select Options\n   • Images\n3️⃣ Masukkan nama kolum\n4️⃣ Simpan\n\n**Tunjuk/Sembunyi Kolum**:\n• Klik butang **'Customize'**\n• Toggle kolum on/off\n• Drag untuk susun semula\n\n**💡 Pro Tip**: Kolum custom disimpan per pengguna!",
      
      images: "🖼️ **Pengurusan Gambar**\n\n**Tambah Gambar** (Edit Mode):\n1️⃣ Klik **ikon gambar** dalam baris\n2️⃣ Pilih kaedah muat naik:\n   • 📁 Muat naik fail\n   • 🔗 URL gambar\n3️⃣ Tambah caption (pilihan)\n4️⃣ Simpan\n\n**Lihat Gambar**:\n• Klik thumbnail untuk buka **lightbox**\n• Swipe/arrow keys untuk navigasi\n• Paparan skrin penuh\n\n**💡 Ciri-ciri**:\n• Berbilang gambar per lokasi\n• Sokongan caption\n• Lazy loading untuk prestasi",
      
      route: "🗺️ **Pengoptimuman Laluan**\n\n**Cara Mengoptimumkan**:\n1️⃣ Pilih lokasi (checkboxes)\n2️⃣ Menu → **'Optimize Route'**\n3️⃣ Semak urutan yang dioptimumkan\n4️⃣ Apply jika berpuas hati\n\n**Faedah**:\n• 📉 Minimumkan jarak perjalanan\n• ⏱️ Jimat masa\n• ⛽ Kurangkan kos minyak\n• 🤖 Algoritma berkuasa AI\n\n**💡 Tip**: Sentiasa sertakan QL Kitchen sebagai titik permulaan!",
      
      share: "🔗 **Perkongsian Jadual**\n\n**Kongsi Paparan Semasa**:\n1️⃣ Klik butang **'Share'**\n2️⃣ Salin pautan yang dijana\n3️⃣ Hantar kepada ahli pasukan\n\n**Pautan Kongsi Termasuk**:\n• Penapis semasa\n• Keterlihatan kolum\n• Susunan isih\n• Tetapan halaman\n\n**Jadual Custom**:\n• Cipta jadual custom dengan baris terpilih\n• Jana pautan kongsi unik\n• Penerima lihat paparan read-only\n\n**💡 Selamat**: Setiap pautan adalah unik dan boleh dijejaki!",
      
      bulk: "🎨 **Kemas Kini Warna Pukal**\n\n**Tetapkan Warna mengikut Laluan** (Edit Mode):\n1️⃣ Menu → **'Set Color by Route'**\n2️⃣ Pilih laluan\n3️⃣ Pilih warna:\n   • Guna color picker\n   • Masukkan kod hex\n   • Pilih dari preset\n4️⃣ Klik **'Update'**\n\n**Hasil**: Semua lokasi di laluan itu dapat warna marker yang sama!\n\n**💡 Kes Guna**: Bezakan laluan secara visual pada paparan peta",
      
      calendar: "📅 **Ciri Calendar**\n\n**Tambah Event**:\n1️⃣ Klik pada tarikh\n2️⃣ Masukkan butiran event\n3️⃣ Simpan\n\n**Edit/Padam**:\n• Klik event sedia ada\n• Ubah atau padam\n\n**💡 Sesuai untuk**: Jadual penghantaran, perancangan, acara pasukan",
      
      custom: "📋 **Jadual Custom**\n\n**Cipta Jadual Custom**:\n1️⃣ Pilih lokasi\n2️⃣ Klik **'Create Custom Table'**\n3️⃣ Masukkan nama & penerangan\n4️⃣ Simpan\n\n**💡 Kes Guna**: Cipta jadual untuk jadual penghantaran berbeza!",
      
      theme: "🎨 **Tetapan Tema**\n\n**Tukar Tema**:\n• Klik butang **theme toggle** (☀️/🌙)\n\n**💡 Tip**: Dark mode kurangkan tekanan mata",
      
      pwa: "📱 **PWA (Progressive Web App)**\n\n**Install App**:\n• Chrome/Edge: Klik install prompt\n• iOS Safari: Share → Add to Home Screen\n\n**💡 Tip**: Install untuk akses pantas!",
      
      shortcuts: "⌨️ **Keyboard Shortcuts**\n\n• `Esc` - Tutup modals\n• `Enter` - Edit cell\n• `Tab` - Next cell\n\n**💡 Pro Tip**: Master shortcuts untuk produktiviti 10x!",
      
      tips: "💡 **Pro Tips & Amalan Terbaik**\n\n**Prestasi**:\n• ⚡ Guna penapis\n• 🖼️ Lazy loading\n\n**Organisasi**:\n• 🎨 Guna color coding\n• 📋 Cipta jadual custom\n\n**💡 Ingat**: Semua perubahan auto-save!",
      
      default: "🤖 **Apa Yang Boleh Saya Bantu?**\n\nSaya di sini untuk membantu! Anda boleh tanya saya tentang:\n\n**📚 Ciri-ciri**:\n• Edit Mode\n• Drag & Drop\n• Penapis & Carian\n• Penyesuaian Kolum\n• Pengurusan Gambar\n• Pengoptimuman Laluan\n• Perkongsian Jadual\n• Jadual Custom\n• Calendar\n• Kemas Kini Warna Pukal\n• Pemasangan PWA\n\n**🎯 Cuba tanya**:\n• 'Macam mana nak edit data?'\n• 'Macam mana nak filter laluan?'\n• 'Macam mana nak tambah gambar?'\n• 'Macam mana nak optimize laluan?'\n• 'Macam mana nak share jadual?'\n• 'Tunjuk keyboard shortcuts'\n• 'Bagi pro tips'\n\n**💬 Atau tanya sahaja**: Saya faham konteks!"
    },
    ta: {
      editMode: "🔐 **Edit Mode வழிகாட்டி**\n\nEdit Mode ஐ இயக்க:\n1️⃣ **Menu** (☰) பொத்தானைக் கிளிக் செய்யவும்\n2️⃣ **'Edit Mode'** ஐத் தேர்ந்தெடுக்கவும்\n3️⃣ உங்கள் **கடவுச்சொல்லை** உள்ளிடவும்\n4️⃣ அங்கீகரிக்கப்பட்டவுடன், நீங்கள் முடியும்:\n   • ✏️ செல்களை நேரடியாக திருத்தவும்\n   • 🔄 வரிசைகளை மறுவரிசைப்படுத்த drag & drop\n   • ➕ புதிய வரிசைகளைச் சேர்க்கவும்\n   • ➖ வரிசைகளை நீக்கவும்\n   • 📊 நெடுவரிசைகளைச் சேர்க்க/நீக்கவும்\n   • 🖼️ படங்களைப் பதிவேற்றவும்\n   • 🎨 marker வண்ணங்களைத் தனிப்பயனாக்கவும்\n\n💡 **Pro Tip**: எல்லா மாற்றங்களும் தானாக சேமிக்கப்படும்!",
      
      drag: "🔄 **வரிசைகளை மறுவரிசைப்படுத்துதல்**\n\n**முன்நிபந்தனை**: முதலில் Edit Mode ஐ இயக்கவும்\n\n**படிகள்**:\n1️⃣ ஒவ்வொரு வரிசையின் இடது பக்கத்தில் **grip icon** (⋮⋮) ஐக் கண்டறியவும்\n2️⃣ grip icon ஐ **கிளிக் செய்து பிடிக்கவும்**\n3️⃣ வரிசையை மேலே அல்லது கீழே **drag** செய்யவும்\n4️⃣ புதிய நிலையில் drop செய்ய **விடுவிக்கவும்**\n\n✅ மாற்றங்கள் **தானாக சேமிக்கப்படும்**\n🚀 மென்மையான செயல்திறனுக்கு உகப்பாக்கப்பட்டது!",
      
      filter: "🔍 **வடிகட்டி & தேடல்**\n\n**தேடல் பெட்டி**:\n• **எல்லா நெடுவரிசைகளிலும்** வடிகட்ட எதையும் தட்டச்சு செய்யவும்\n\n**💡 Tip**: செயலில் உள்ள வடிகட்டிகள் badges ஆக காட்டப்படும்!",
      
      column: "📊 **நெடுவரிசை தனிப்பயனாக்கம்**\n\n**நெடுவரிசை சேர்**:\n• **'Customize'** பொத்தானைக் கிளிக் செய்யவும்\n\n**💡 Pro Tip**: தனிப்பயன் நெடுவரிசைகள் பயனருக்கு சேமிக்கப்படும்!",
      
      images: "🖼️ **படம் மேலாண்மை**\n\n**படங்களைச் சேர்** (Edit Mode):\n1️⃣ வரிசையில் **படம் icon** ஐக் கிளிக் செய்யவும்\n2️⃣ பதிவேற்ற முறையைத் தேர்ந்தெடுக்கவும்\n\n**💡 அம்சங்கள்**:\n• ஒரு இடத்திற்கு பல படங்கள்\n• captions ஆதரவு",
      
      route: "🗺️ **பாதை உகப்பாக்கம்**\n\n**உகப்பாக்க எப்படி**:\n1️⃣ இடங்களைத் தேர்ந்தெடுக்கவும்\n2️⃣ Menu → **'Optimize Route'**\n\n**💡 Tip**: எப்போதும் QL Kitchen ஐ தொடக்க புள்ளியாக உள்ளடக்குகிறது!",
      
      share: "🔗 **அட்டவணை பகிர்வு**\n\n**தற்போதைய காட்சியைப் பகிர்**:\n1️⃣ **'Share'** பொத்தானைக் கிளிக் செய்யவும்\n\n**💡 பாதுகாப்பான**: ஒவ்வொரு இணைப்பும் தனித்துவமானது!",
      
      bulk: "🎨 **மொத்த வண்ண புதுப்பிப்பு**\n\n**பாதை மூலம் வண்ணத்தை அமை**:\n1️⃣ Menu → **'Set Color by Route'**\n\n**💡 பயன்பாடு**: வரைபடத்தில் பாதைகளை காட்சிப்படுத்துதல்",
      
      calendar: "📅 **நாள்காட்டி அம்சங்கள்**\n\n**நிகழ்வு சேர்**:\n1️⃣ தேதியைக் கிளிக் செய்யவும்\n\n**💡 சரியானது**: விநியோக பாதைகளை திட்டமிடுதல்",
      
      custom: "📋 **தனிப்பயன் அட்டவணைகள்**\n\n**தனிப்பயன் அட்டவணை உருவாக்கு**:\n1️⃣ இடங்களைத் தேர்ந்தெடுக்கவும்\n\n**💡 பயன்பாடு**: வெவ்வேறு அட்டவணைகளுக்கு அட்டவணைகளை உருவாக்குங்கள்!",
      
      theme: "🎨 **தீம் அமைப்புகள்**\n\n**தீம் மாற்று**:\n• **theme toggle** பொத்தானைக் கிளிக் செய்யவும் (☀️/🌙)\n\n**💡 Tip**: Dark mode கண் அழுத்தத்தை குறைக்கிறது",
      
      pwa: "📱 **PWA (Progressive Web App)**\n\n**App நிறுவு**:\n• Chrome/Edge: install prompt ஐக் கிளிக் செய்யவும்\n\n**💡 Tip**: விரைவான அணுகலுக்கு நிறுவவும்!",
      
      shortcuts: "⌨️ **Keyboard Shortcuts**\n\n• `Esc` - modals மூடு\n• `Enter` - cell திருத்து\n\n**💡 Pro Tip**: 10x உற்பத்தித்திறனுக்கு shortcuts ஐ மாஸ்டர் செய்யுங்கள்!",
      
      tips: "💡 **Pro Tips & சிறந்த நடைமுறைகள்**\n\n**செயல்திறன்**:\n• ⚡ வடிகட்டிகளைப் பயன்படுத்துங்கள்\n\n**💡 நினைவில் கொள்ளுங்கள்**: எல்லா மாற்றங்களும் தானாக சேமிக்கப்படும்!",
      
      default: "🤖 **நான் எவ்வாறு உதவ முடியும்?**\n\nநான் உங்களுக்கு உதவ இங்கு இருக்கிறேன்! நீங்கள் என்னிடம் கேட்கலாம்:\n\n**📚 அம்சங்கள்**:\n• Edit Mode\n• Drag & Drop\n• வடிகட்டிகள் & தேடல்\n• நெடுவரிசை தனிப்பயனாக்கம்\n• படம் மேலாண்மை\n• பாதை உகப்பாக்கம்\n• அட்டவணை பகிர்வு\n• தனிப்பயன் அட்டவணைகள்\n• நாள்காட்டி\n• மொத்த வண்ண புதுப்பிப்புகள்\n• PWA நிறுவல்\n\n**🎯 முயற்சி செய்யவும்**:\n• 'தரவை எவ்வாறு திருத்துவது?'\n• 'பாதைகளை எவ்வாறு வடிகட்டுவது?'\n• 'படங்களை எவ்வாறு சேர்ப்பது?'\n• 'பாதையை எவ்வாறு உகப்பாக்குவது?'\n• 'அட்டவணையை எவ்வாறு பகிர்வது?'\n\n**💬 அல்லது இயல்பாக கேளுங்கள்**: நான் சூழலை புரிந்துகொள்கிறேன்!"
    },
    zh: {
      editMode: "🔐 **编辑模式指南**\n\n启用编辑模式：\n1️⃣ 点击**菜单** (☰) 按钮\n2️⃣ 选择**'编辑模式'**\n3️⃣ 输入您的**密码**\n4️⃣ 验证后，您可以：\n   • ✏️ 直接编辑单元格\n   • 🔄 拖放行以重新排序\n   • ➕ 添加新行\n   • ➖ 删除行\n   • 📊 添加/删除列\n   • 🖼️ 上传图片\n   • 🎨 自定义标记颜色\n\n💡 **专业提示**：所有更改都会自动保存到数据库！",
      
      drag: "🔄 **重新排序行**\n\n**先决条件**：首先启用编辑模式\n\n**步骤**:\n1️⃣ 查找每行左侧的**抓取图标** (⋮⋮)\n2️⃣ **点击并按住**抓取图标\n3️⃣ 向上或向下**拖动**行\n4️⃣ **释放**以放置在新位置\n\n✅ 更改**自动保存**\n🚀 优化以实现流畅性能！",
      
      filter: "🔍 **筛选和搜索**\n\n**搜索框**:\n• 输入任何内容以跨**所有列**筛选\n\n**💡 提示**: 活动筛选显示为徽章！",
      
      column: "📊 **列自定义**\n\n**添加列** (编辑模式):\n1️⃣ Menu → **'Add Column'**\n\n**💡 专业提示**: 自定义列按用户保存！",
      
      images: "🖼️ **图片管理**\n\n**添加图片** (编辑模式):\n1️⃣ 点击行中的**图片图标**\n\n**💡 功能**:\n• 每个位置多张图片",
      
      route: "🗺️ **路线优化**\n\n**如何优化**:\n1️⃣ 选择位置\n2️⃣ Menu → **'Optimize Route'**\n\n**💡 提示**: 始终包括QL Kitchen作为起点！",
      
      share: "🔗 **表格共享**\n\n**共享当前视图**:\n1️⃣ 点击**'Share'**按钮\n\n**💡 安全**: 每个链接都是唯一的！",
      
      bulk: "🎨 **批量颜色更新**\n\n**按路线设置颜色**:\n1️⃣ Menu → **'Set Color by Route'**\n\n**💡 用例**: 在地图上视觉区分路线",
      
      calendar: "📅 **日历功能**\n\n**添加事件**:\n1️⃣ 点击日期\n\n**💡 完美适用于**: 安排配送路线",
      
      custom: "📋 **自定义表格**\n\n**创建自定义表格**:\n1️⃣ 选择位置\n\n**💡 用例**: 为不同的日程创建表格！",
      
      theme: "🎨 **主题设置**\n\n**切换主题**:\n• 点击**theme toggle**按钮 (☀️/🌙)\n\n**💡 提示**: 深色模式减少眼睛疲劳",
      
      pwa: "📱 **PWA (渐进式网络应用)**\n\n**安装应用**:\n• Chrome/Edge: 点击安装提示\n\n**💡 提示**: 安装以便最快访问！",
      
      shortcuts: "⌨️ **键盘快捷键**\n\n• `Esc` - 关闭模态框\n• `Enter` - 编辑单元格\n\n**💡 专业提示**: 掌握快捷键以实现10倍生产力！",
      
      tips: "💡 **专业提示和最佳实践**\n\n**性能**:\n• ⚡ 使用筛选器\n\n**💡 记住**: 所有更改都会自动保存！",
      
      default: "🤖 **我能帮您什么？**\n\n我在这里帮助您！您可以问我关于：\n\n**📚 功能**:\n• 编辑模式\n• 拖放\n• 筛选和搜索\n• 列自定义\n• 图片管理\n• 路线优化\n• 表格共享\n• 自定义表格\n• 日历\n• 批量颜色更新\n• PWA 安装\n\n**🎯 尝试询问**:\n• '如何编辑数据？'\n• '如何筛选路线？'\n• '如何添加图片？'\n• '如何优化路线？'\n• '如何共享表格？'\n• '显示键盘快捷键'\n• '给我专业提示'\n\n**💬 或自然地提问**: 我理解上下文！"
    }
  };
  
  const lang = responses[language] || responses.en;
  
  // Edit Mode
  if ((q.includes('edit') && (q.includes('mode') || q.includes('how'))) || q.includes('macam mana') && q.includes('edit')) {
    return lang.editMode;
  }
  
  // Drag & Drop
  if (q.includes('drag') || q.includes('reorder') || q.includes('move') || q.includes('susun') || q.includes('rearrange')) {
    return lang.drag;
  }
  
  // Filters
  if (q.includes('filter') || q.includes('search') || q.includes('cari') || q.includes('penapis') || q.includes('find')) {
    return lang.filter;
  }
  
  // Columns
  if (q.includes('column') || q.includes('kolum') || q.includes('customize') || q.includes('add column')) {
    return lang.column;
  }
  
  // Images
  if (q.includes('image') || q.includes('picture') || q.includes('photo') || q.includes('gambar') || q.includes('upload')) {
    return lang.images;
  }
  
  // Route optimization
  if (q.includes('route') && (q.includes('optim') || q.includes('best')) || q.includes('laluan') && q.includes('optim')) {
    return lang.route;
  }
  
  // Sharing
  if (q.includes('share') || q.includes('sharing') || q.includes('kongsi') || q.includes('link')) {
    return lang.share;
  }
  
  // Bulk color
  if (q.includes('bulk') && q.includes('color') || q.includes('color') && q.includes('route') || q.includes('warna') && q.includes('route')) {
    return lang.bulk;
  }
  
  // Calendar
  if (q.includes('calendar') || q.includes('schedule') || q.includes('event') || q.includes('kalendar')) {
    return lang.calendar;
  }
  
  // Custom tables
  if (q.includes('custom') && q.includes('table') || q.includes('jadual custom')) {
    return lang.custom;
  }
  
  // Theme
  if (q.includes('theme') || q.includes('dark') || q.includes('light') || q.includes('mode') && !q.includes('edit')) {
    return lang.theme;
  }
  
  // PWA
  if (q.includes('pwa') || q.includes('install') || q.includes('app') || q.includes('offline')) {
    return lang.pwa;
  }
  
  // Shortcuts
  if (q.includes('shortcut') || q.includes('keyboard') || q.includes('key')) {
    return lang.shortcuts;
  }
  
  // Tips
  if (q.includes('tip') || q.includes('best practice') || q.includes('pro tip') || q.includes('advice')) {
    return lang.tips;
  }
  
  // Default response
  return lang.default;
};

export function HelpChatbot({ open, onOpenChange }: HelpChatbotProps) {
  const [language, setLanguage] = useState<Language>('en');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: languageResponses.en.welcome,
      sender: 'bot',
      timestamp: new Date(),
      isMarkdown: true
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  
  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Reset welcome message when language changes
  useEffect(() => {
    setMessages([
      {
        id: '1',
        text: languageResponses[language].welcome,
        sender: 'bot',
        timestamp: new Date(),
        isMarkdown: true
      }
    ]);
  }, [language]);

  const handleSend = () => {
    if (!input.trim()) return;

    // Check for language change request
    const detectedLang = detectLanguage(input);
    if (detectedLang && detectedLang !== language) {
      // Language change request
      const userMessage: Message = {
        id: Date.now().toString(),
        text: input,
        sender: 'user',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setIsTyping(true);
      
      setTimeout(() => {
        setLanguage(detectedLang);
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: languageResponses[detectedLang].languageChanged,
          sender: 'bot',
          timestamp: new Date(),
          isMarkdown: true
        };
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
      }, 500);
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate bot thinking with realistic delay
    setTimeout(() => {
      const response = getResponse(input, language);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'bot',
        timestamp: new Date(),
        isMarkdown: true
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 800);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: '1',
        text: languageResponses[language].welcome,
        sender: 'bot',
        timestamp: new Date(),
        isMarkdown: true
      }
    ]);
    toast({
      description: languageResponses[language].cleared,
    });
  };

  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
    toast({
      description: languageResponses[language].copied,
    });
  };

  // Format message text with markdown-like styling
  const formatMessage = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Bold text
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      return <p key={i} className="mb-1 last:mb-0" dangerouslySetInnerHTML={{ __html: line }} />;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[700px] flex flex-col p-0 bg-white/80 dark:bg-black/40 backdrop-blur-3xl border-2 border-gray-200/60 dark:border-white/10 shadow-[0_20px_80px_0_rgba(0,0,0,0.3)] rounded-2xl">
        {/* Gradient Background */}
        <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-pink-50/80 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/20" />
        
        <DialogHeader className="px-6 py-4 border-b border-border/20 backdrop-blur-sm">
          <DialogTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                    AI Assistant
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-2 py-0 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Advanced
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Languages className="w-3 h-3" />
                  <span>{language === 'en' ? 'English' : language === 'ms' ? 'Bahasa Melayu' : language === 'ta' ? 'தமிழ்' : '中文'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60"
                title="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-yellow-500" />
                ) : (
                  <Moon className="w-4 h-4 text-blue-500" />
                )}
              </Button>
              
              {/* Clear Chat */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearChat}
                className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 group ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.sender === 'bot' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'} max-w-[80%]`}>
                  <div
                    className={`rounded-2xl px-4 py-3 transition-all duration-200 ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
                        : 'bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100 shadow-md backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50'
                    }`}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.isMarkdown ? formatMessage(message.text) : message.text}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {message.sender === 'bot' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyMessage(message.text, message.id)}
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Copy message"
                      >
                        {copiedId === message.id ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3 text-gray-400" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                {message.sender === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center shadow-lg">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl px-4 py-3 shadow-md backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t border-border/20 backdrop-blur-sm">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about the app..."
              className="flex-1 bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 rounded-xl"
              disabled={isTyping}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              size="icon"
              className="bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send className="w-4 h-4 text-white" />
            </Button>
          </div>
          <div className="mt-2 text-center">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              💡 Try: "How to edit data?" or "Give me pro tips"
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
