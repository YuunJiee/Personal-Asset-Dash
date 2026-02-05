# Frontend - Yantage UI

Next.js 15 application with App Router for personal asset management.

## 🏗️ Architecture

```
frontend/
├── app/                  # Next.js App Router
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Dashboard (/)
│   ├── assets/           # Assets page
│   ├── investments/      # Investments page
│   ├── history/          # Transaction history
│   ├── calendar/         # Financial calendar
│   ├── analytics/        # Analytics page
│   ├── expenses/         # Expense tracking
│   └── settings/         # Settings page
├── components/           # React components
│   ├── ui/               # Shadcn/UI primitives
│   ├── views/            # Complex view components
│   └── [feature].tsx     # Feature components
├── src/
│   ├── i18n/             # Internationalization
│   └── lib/              # Utility functions
├── lib/
│   └── utils.ts          # Helper functions
└── public/               # Static assets
```

## 🚀 Getting Started

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🎨 UI Components

### Design System

Built with **Shadcn/UI** + **TailwindCSS**:
- Consistent spacing, colors, and typography
- Dark mode support via `next-themes`
- Responsive design (mobile-first)

### Key Components

#### Layout Components
- `AppSidebar`: Main navigation sidebar
- `ClientLayout`: Client-side layout wrapper
- `ThemeProvider`: Dark/light mode management

#### Feature Components
- `DashboardClient`: Main dashboard view
- `AssetAccordion`: Collapsible asset list
- `NetWorthTrendChart`: Historical net worth chart
- `MonthlyChangeChart`: Monthly change visualization
- `GoalWidget`: Financial goal progress
- `RebalanceWidget`: Portfolio rebalancing suggestions

#### Dialog Components
- `AddAssetDialog`: Create/edit assets
- `TradeDialog`: Record investment trades
- `GoalDialog`: Set financial goals
- `WealthSimulatorDialog`: Wealth projection tool
- `EmergencyFundDialog`: Emergency fund calculator

#### Utility Components
- `PrivacyProvider`: Privacy mode toggle
- `LanguageProvider`: i18n management
- `CategoryVisibility`: Asset category filters

## 🌍 Internationalization

### Supported Languages
- English (en)
- Traditional Chinese (zh-TW)

### Adding Translations

Edit `src/i18n/dictionaries.ts`:

```typescript
export const dictionaries = {
  en: {
    key: "English text",
    // ...
  },
  'zh-TW': {
    key: "中文文字",
    // ...
  }
}
```

### Usage in Components

```tsx
import { useLanguage } from "@/components/LanguageProvider";

function MyComponent() {
  const { t } = useLanguage();
  return <h1>{t('key')}</h1>;
}
```

## 📊 Data Fetching

### API Integration

All API calls use native `fetch`:

```typescript
// Example: Fetch dashboard data
const response = await fetch('http://localhost:8000/api/dashboard/');
const data = await response.json();
```

### State Management

- **Server Components**: Fetch data at build/request time
- **Client Components**: Use React hooks (`useState`, `useEffect`)
- **Context Providers**: Global state (theme, language, privacy)

## 🎨 Styling

### TailwindCSS

Custom configuration in `tailwind.config.ts`:
- CSS variables for theming
- Custom animations
- Responsive breakpoints

### Dark Mode

Automatic dark mode support:
```tsx
import { useTheme } from "next-themes";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
    Toggle
  </button>;
}
```

## 📱 Responsive Design

### Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile Optimizations

- Collapsible sidebar with overlay
- Card-based layouts for tables
- Touch-friendly button sizes
- Swipe gestures (where applicable)

## 🧪 Development

### Adding New Pages

1. Create route in `app/[page]/page.tsx`
2. Add navigation link in `AppSidebar`
3. Add translations in `dictionaries.ts`

### Creating Components

```tsx
// components/MyComponent.tsx
'use client';  // If using hooks/interactivity

import { useLanguage } from "@/components/LanguageProvider";

export function MyComponent() {
  const { t } = useLanguage();
  return <div>{t('my_key')}</div>;
}
```

### Using UI Primitives

```tsx
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

<Button variant="default">Click me</Button>
```

## 🔧 Build & Deployment

### Production Build

```bash
npm run build
npm start  # Runs on port 3000
```

### Static Export (Optional)

```bash
# Add to next.config.ts:
output: 'export'

npm run build  # Generates static files in /out
```

## 🐛 Troubleshooting

### Hydration Errors
- Ensure server/client HTML matches
- Use `'use client'` directive for interactive components

### API Connection Issues
- Verify backend is running on port 8000
- Check CORS settings in FastAPI

### Build Errors
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## 📚 Dependencies

### Core
- **Next.js 15**: React framework
- **React 19**: UI library
- **TypeScript**: Type safety

### UI
- **Shadcn/UI**: Component library
- **TailwindCSS**: Utility-first CSS
- **Lucide React**: Icon library
- **Recharts**: Charting library

### Utilities
- **next-themes**: Theme management
- **clsx**: Conditional classnames
- **tailwind-merge**: Merge Tailwind classes

## 📝 Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js recommended config
- **Formatting**: Prettier (recommended)

## 🎯 Performance Tips

- Use Server Components by default
- Lazy load heavy components
- Optimize images with `next/image`
- Minimize client-side JavaScript
