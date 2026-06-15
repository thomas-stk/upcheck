import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

/*
  StrictMode renders components twice in dev to surface side effects and bugs early.
  Zero effect in production.

  The '!' after getElementById is a TypeScript non-null assertion. TypeScript doesn't
  know #root always exists. The '!' says "trust me, this won't be null." Safe here
  because we control index.html.
*/
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
