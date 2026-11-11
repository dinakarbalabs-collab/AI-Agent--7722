# Crypto Oracle — Design System

Inspiration (style only): dark SaaS landing with violet/indigo glow, centered large grotesk headline, glowing gradient pill buttons, floating glass UI panels, perspective grid floor, hairline borders, deep-black canvas.

## Color
- bg `#05050A`, surface `#0B0B14`, raised `#11111D`, hairline `rgba(255,255,255,.08)`
- text `#F2F2F8`, muted `#8B8BA3`, dim `#5A5A70`
- brand violet `#6D5BFF` → `#8B7CFF` (gradient + glow `0 0 32px rgba(109,91,255,.45)`)
- gain `#22D39A`, loss `#FF5C7A`, warn `#F5B54A`, info `#4CC9F0`. Gain/loss only on data & verdicts.

## Type
- Headings: Sora (600/700, tight tracking -0.03em)
- Body/UI: Manrope
- Numbers (prices, %, tables): Geist Mono, tabular-nums
- Hero h1 ~ clamp(40px, 6vw, 76px); section h2 ~ 32-40px; table 13-14px

## Layout & spacing
- max-w 1280, 24px gutters; 8px grid. Dense calm tables (row 56px), generous hero whitespace.
- Radius: panels 16px, buttons pill/12px, chips pill.
- Panels: glass (`bg rgba(255,255,255,.03)`, border hairline, backdrop-blur, subtle top highlight).
- Hero: radial violet glow + perspective grid floor, floating glass mock of live data.

## Components
- Primary button: violet gradient, glow, 12px radius. Ghost: hairline border.
- Currency toggle: segmented `$ USD | ₹ INR` in navbar.
- Verdict badges: Bullish (gain), Neutral (warn), Bearish (loss).
- Disclaimer banner: fixed bottom on every page, amber hairline, always visible.

## Motion
- One staggered fade/slide-up on page load (motion). Number flashes on price change. No decorative loops except slow glow drift.
