# Frontend setup (run once, inside /brandguard)

npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --no-turbopack --import-alias "@/*"
cd frontend
npx shadcn@latest init
npx shadcn@latest add button card badge textarea input tabs dialog separator scroll-area
npm install react-diff-viewer-continued lucide-react

Create frontend/.env.local:
NEXT_PUBLIC_API_URL=http://localhost:8000

Run:  npm run dev   ->  http://localhost:3000