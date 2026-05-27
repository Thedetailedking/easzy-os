---
name: Kinetic Logic
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3e4a3d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6e7b6c'
  outline-variant: '#bdcaba'
  surface-tint: '#006e2d'
  primary: '#006b2c'
  on-primary: '#ffffff'
  primary-container: '#00873a'
  on-primary-container: '#f7fff2'
  inverse-primary: '#62df7d'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#4f5d72'
  on-tertiary: '#ffffff'
  tertiary-container: '#67758c'
  on-tertiary-container: '#fdfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#7ffc97'
  primary-fixed-dim: '#62df7d'
  on-primary-fixed: '#002109'
  on-primary-fixed-variant: '#005320'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#d5e3fd'
  tertiary-fixed-dim: '#b9c7e0'
  on-tertiary-fixed: '#0d1c2f'
  on-tertiary-fixed-variant: '#3a485c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  surface-main: '#FFFFFF'
  surface-subtle: '#F9FAFB'
  border-subtle: '#E5E7EB'
  success-vibrant: '#22C55E'
  midnight-void: '#020617'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  container-max: 1280px
  gutter-desktop: 24px
  gutter-mobile: 16px
  margin-desktop: 40px
  margin-mobile: 20px
---

## Brand & Style

The design system is engineered for **Content OS**, a high-performance productivity environment for African AI educators. The brand personality is **Authoritative, Grounded, and Efficient**. It moves away from "startup fluff" toward a "pro-tool" aesthetic—prioritizing clarity of information and speed of execution.

The visual style is **Minimalist / Corporate Modern**. It draws heavily from the functional density of developer tools while maintaining a premium editorial feel. It utilizes generous whitespace to reduce cognitive load, paired with high-quality typography to establish an expert tone. The interface should feel like a sophisticated instrument—precise, responsive, and reliable.

## Colors

The palette is anchored by **Vibrant Green**, symbolizing growth and the "go" state of content production, and **Midnight Blue**, providing the professional weight required for an educational authority.

- **Primary (Green):** Used for primary actions, success states, and key brand moments. It must remain legible against white.
- **Secondary (Midnight):** Used for navigation backgrounds, primary headings, and high-contrast UI elements to provide a "grounded" feel.
- **Neutrals:** A scale of cool grays (Slate) is used to define hierarchy without adding visual noise. 
- **Color Mode:** The default is light mode to ensure maximum readability for long-form content editing, though the deep secondary palette allows for a high-contrast dark mode transition.

## Typography

This design system uses a triple-font approach to balance technical precision with editorial authority:
1. **Space Grotesk (Headlines):** A geometric sans-serif with idiosyncratic "tech" details. It conveys the AI-forward nature of the platform.
2. **Inter (Body):** The industry standard for readability. Used for all long-form text, UI labels, and inputs to ensure a neutral, functional reading experience.
3. **JetBrains Mono (Labels/Metadata):** Used sparingly for tags, timestamps, and system data to reinforce the "Content OS" utility aspect.

**Scaling:** On mobile, large headlines should drop by one tier (e.g., XL becomes LG) to prevent awkward word breaks while maintaining the bold, impactful character of the typeface.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. While the content containers have a maximum width for readability (1280px), the internal elements use a fluid 12-column grid.

- **Mobile-First:** Layouts are designed for single-column vertical flow. Padding is kept tight (16px) to maximize screen real estate for content creation.
- **Rhythm:** An 8px linear scale is used for all spatial relationships. 
- **Pro-Tool Density:** Content-heavy areas (like the OS dashboard) should utilize "compact" spacing (8px-12px) between related items, while landing pages and editorial views use "wide" spacing (32px-64px) to emphasize the minimalist aesthetic.

## Elevation & Depth

To maintain a "Pro-Tool" feel inspired by high-end SaaS, the system avoids heavy drop shadows. Instead, it uses **Tonal Layers** and **Low-Contrast Outlines**.

- **Depth levels:**
    - **Level 0 (Background):** Surface-subtle (#F9FAFB).
    - **Level 1 (Cards/Work Area):** Surface-main (#FFFFFF) with a 1px solid border (#E5E7EB).
    - **Level 2 (Popovers/Modals):** Surface-main with a very soft, diffused ambient shadow (10% opacity) and a slightly darker border to separate it from the work area.
- **Active State:** Elements being interacted with (like a selected content block) receive a 2px primary green border rather than an elevation change.

## Shapes

The shape language is **Soft (0.25rem / 4px)**. This creates a disciplined, architectural feel. 

- **Standard Elements:** Buttons, input fields, and small cards use the base 4px radius.
- **Large Components:** Section containers or main dashboard panels may use `rounded-lg` (8px) to soften the overall interface without losing the professional edge.
- **Pills:** Only used for status indicators (e.g., "Published" or "Draft") to distinguish them from functional buttons.

## Components

- **Buttons:** High-contrast primary buttons use the Primary Green with white text. Secondary buttons use an outline style with Midnight Blue text. All buttons have a subtle transition effect on hover.
- **Inputs:** Clean, 1px bordered boxes with Inter Regular 16px text. Focus states should be indicated by a 2px Primary Green border.
- **Sliders:** Minimalist tracks in light gray with a Primary Green thumb. Values should be displayed in JetBrains Mono above the thumb.
- **Section Headers:** Bold Space Grotesk headings paired with a subtle horizontal rule or a "Midnight Blue" sidebar accent to denote hierarchy.
- **Chips/Tags:** Monospaced text (JetBrains Mono) inside 4px rounded containers. Use subtle background tints of the status color (e.g., light green background for success).
- **Cards:** White background, 1px gray border, no shadow. Content is organized with clear vertical rhythm.
- **OS Navigation:** A persistent, deep charcoal (Midnight Blue) sidebar on desktop, or a bottom-docked navigation bar on mobile, providing constant access to core OS functions.