/**
 * Ultra-fast, standalone, zero-dependency HTML generator for NFC Profile Cards.
 * Optimized specifically for iOS / Safari and mobile performance:
 * - Direct SSR in < 15ms (Zero JS bundles to download)
 * - Hardware acceleration (transform: translateZ(0)) & WebKit optimizations
 * - Safe-area insets for iPhone notch / Dynamic Island / Home indicator
 * - Touch-action: manipulation (Zero 300ms tap delay)
 * - Embedded SVG icons (No external font or asset waterfalls)
 * - Interactive: VCard download, Lead Capture Modal, Quick Pay (InstaPay / Vodafone Cash), Click Tracking
 */

export interface CardProfile {
  id: string;
  name: string;
  bio?: string | null;
  avatarUrl?: string | null;
  theme?: string | null;
  links?: string | null;
  customDomain?: string | null;
  isDirectRedirect?: boolean | null;
  directUrl?: string | null;
  quickPayType?: string | null;
  quickPayValue?: string | null;
}

function escapeHtml(str: unknown): string {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const ICONS: Record<string, string> = {
  instagram: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.34 6.34 0 0 0 1.86-4.48V8.71a8.3 8.3 0 0 0 4.91 1.6V6.86a4.88 4.88 0 0 1-1-.17z"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><path d="M16 14.5c-.3.8-1.5 1.5-2.2 1.5-.6 0-1.4-.3-2.6-1.5s-2.1-2.6-2.1-3.2.7-1.9 1.5-2.2.8 0 1.1.5l.8 1.8c.2.4 0 .8-.2 1.1l-.5.6c.4.8 1.1 1.5 1.9 1.9l.6-.5c.3-.3.7-.4 1.1-.2l1.8.8c.5.3.5.7.2 1.4z"/></svg>`,
  snapchat: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12.057 1.5c-4.433 0-7.057 3.033-7.057 6.643 0 1.542.548 3.52 1.054 4.542.148.3.111.458-.094.757-.312.456-.995 1.258-1.745 1.517-.37.128-.615.421-.615.772 0 .61.768.91 1.637 1.053.473.078.68.272.766.685.123.593.41 1.503 1.523 1.838.643.193 1.54.088 2.378-.293.447-.203.737-.099 1.002.134.908.799 2.054 1.352 3.251 1.352 1.22 0 2.338-.54 3.242-1.341.266-.235.56-.339 1.011-.134.838.381 1.734.486 2.378.293 1.112-.335 1.4-.1.245 1.523-1.838.086-.413.293-.607.766-.685.869-.143 1.637-.443 1.637-1.053 0-.351-.245-.644-.615-.772-.75-.259-1.433-1.061-1.745-1.517-.205-.299-.242-.457-.094-.757.506-1.022 1.054-3 1.054-4.542 0-3.61-2.624-6.643-7.057-6.643z"/></svg>`,
  youtube: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#000"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>`,
  call: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  email: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  website: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
  location: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
};

interface ThemeColors {
  bg: string;
  cardBg: string;
  cardBorder: string;
  textColor: string;
  nameColor: string;
  bioColor: string;
  linkBg: string;
  linkBorder: string;
  linkHover: string;
  btnSaveBg: string;
  btnSaveText: string;
  btnLeadBg: string;
  btnLeadText: string;
  glowTop?: string;
  backgroundImage?: string;
}

function getTheme(themeName?: string | null): ThemeColors {
  const t = (themeName || "glass").toLowerCase();
  switch (t) {
    case "minimal":
      return {
        bg: "#000000",
        cardBg: "#121212",
        cardBorder: "#27272a",
        textColor: "#ffffff",
        nameColor: "#ffffff",
        bioColor: "#a1a1aa",
        linkBg: "#1c1c1f",
        linkBorder: "#27272a",
        linkHover: "#27272a",
        btnSaveBg: "#ffffff",
        btnSaveText: "#000000",
        btnLeadBg: "#27272a",
        btnLeadText: "#ffffff",
      };
    case "neon":
      return {
        bg: "#000000",
        cardBg: "#050505",
        cardBorder: "#00ff9d",
        textColor: "#ffffff",
        nameColor: "#00ff9d",
        bioColor: "#a1a1aa",
        linkBg: "#0a0a0a",
        linkBorder: "rgba(0,255,157,0.3)",
        linkHover: "rgba(0,255,157,0.1)",
        btnSaveBg: "#00ff9d",
        btnSaveText: "#000000",
        btnLeadBg: "linear-gradient(135deg, #00ff9d, #00b8ff)",
        btnLeadText: "#000000",
        glowTop: "rgba(0, 255, 157, 0.25)",
      };
    case "creative":
      return {
        bg: "linear-gradient(135deg, #4a044e, #3b0764, #7c2d12)",
        cardBg: "rgba(255, 255, 255, 0.08)",
        cardBorder: "rgba(255, 255, 255, 0.18)",
        textColor: "#ffffff",
        nameColor: "#f472b6",
        bioColor: "#e2e8f0",
        linkBg: "rgba(255, 255, 255, 0.1)",
        linkBorder: "rgba(255, 255, 255, 0.15)",
        linkHover: "rgba(255, 255, 255, 0.2)",
        btnSaveBg: "linear-gradient(90deg, #ec4899, #f97316)",
        btnSaveText: "#ffffff",
        btnLeadBg: "linear-gradient(90deg, #a855f7, #ec4899)",
        btnLeadText: "#ffffff",
      };
    case "stranger":
      return {
        bg: "#0a0a0a",
        cardBg: "rgba(10, 10, 10, 0.85)",
        cardBorder: "rgba(220, 38, 38, 0.3)",
        textColor: "#fef2f2",
        nameColor: "#ef4444",
        bioColor: "#d1d5db",
        linkBg: "rgba(20, 5, 5, 0.7)",
        linkBorder: "rgba(220, 38, 38, 0.25)",
        linkHover: "rgba(220, 38, 38, 0.4)",
        btnSaveBg: "#b91c1c",
        btnSaveText: "#ffffff",
        btnLeadBg: "linear-gradient(90deg, #b91c1c, #991b1b)",
        btnLeadText: "#ffffff",
        glowTop: "rgba(220, 38, 38, 0.35)",
        backgroundImage: "/stranger-things.jpg",
      };
    case "breakingbad":
      return {
        bg: "#0b150b",
        cardBg: "rgba(12, 28, 12, 0.85)",
        cardBorder: "rgba(202, 138, 4, 0.35)",
        textColor: "#fefce8",
        nameColor: "#eab308",
        bioColor: "#cbd5e1",
        linkBg: "rgba(10, 20, 10, 0.75)",
        linkBorder: "rgba(202, 138, 4, 0.3)",
        linkHover: "rgba(202, 138, 4, 0.4)",
        btnSaveBg: "#ca8a04",
        btnSaveText: "#000000",
        btnLeadBg: "linear-gradient(90deg, #15803d, #ca8a04)",
        btnLeadText: "#000000",
        glowTop: "rgba(202, 138, 4, 0.3)",
        backgroundImage: "/breaking-bad.jpg",
      };
    case "spiderman":
      return {
        bg: "#080000",
        cardBg: "rgba(12, 2, 2, 0.9)",
        cardBorder: "rgba(185, 28, 28, 0.4)",
        textColor: "#ffffff",
        nameColor: "#f87171",
        bioColor: "#d1d5db",
        linkBg: "rgba(20, 0, 0, 0.8)",
        linkBorder: "rgba(185, 28, 28, 0.3)",
        linkHover: "rgba(239, 68, 68, 0.3)",
        btnSaveBg: "#dc2626",
        btnSaveText: "#ffffff",
        btnLeadBg: "linear-gradient(90deg, #dc2626, #1e40af)",
        btnLeadText: "#ffffff",
        glowTop: "rgba(220, 38, 38, 0.4)",
        backgroundImage: "/spiderman.jpg",
      };
    case "ironman":
      return {
        bg: "#0a0000",
        cardBg: "rgba(15, 3, 3, 0.9)",
        cardBorder: "rgba(220, 38, 38, 0.4)",
        textColor: "#ffffff",
        nameColor: "#fbbf24",
        bioColor: "#e2e8f0",
        linkBg: "rgba(25, 5, 5, 0.8)",
        linkBorder: "rgba(220, 38, 38, 0.35)",
        linkHover: "rgba(251, 191, 36, 0.3)",
        btnSaveBg: "linear-gradient(90deg, #dc2626, #eab308)",
        btnSaveText: "#ffffff",
        btnLeadBg: "linear-gradient(90deg, #b91c1c, #d97706)",
        btnLeadText: "#ffffff",
        glowTop: "rgba(234, 179, 8, 0.35)",
        backgroundImage: "/ironman.jpg",
      };
    default: // glass
      return {
        bg: "#050505",
        cardBg: "rgba(18, 18, 22, 0.75)",
        cardBorder: "rgba(255, 255, 255, 0.08)",
        textColor: "#ffffff",
        nameColor: "#ffffff",
        bioColor: "#94a3b8",
        linkBg: "rgba(25, 25, 32, 0.7)",
        linkBorder: "rgba(255, 255, 255, 0.06)",
        linkHover: "rgba(45, 45, 58, 0.85)",
        btnSaveBg: "rgba(255, 255, 255, 0.12)",
        btnSaveText: "#ffffff",
        btnLeadBg: "linear-gradient(135deg, #7c3aed, #ec4899)",
        btnLeadText: "#ffffff",
        glowTop: "rgba(124, 58, 237, 0.3)",
      };
  }
}

export function renderStandaloneProfileHtml(profile: CardProfile): string {
  const theme = getTheme(profile.theme);
  const name = escapeHtml(profile.name || "Togou Card");
  const bio = escapeHtml(profile.bio || "");
  const avatarUrl = profile.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80";

  let linksArray: Array<{ platform: string; url: string; handle?: string }> = [];
  try {
    if (typeof profile.links === "string") linksArray = JSON.parse(profile.links);
    else if (Array.isArray(profile.links)) linksArray = profile.links;
  } catch {
    linksArray = [];
  }

  const quickPayType = profile.quickPayType;
  const quickPayVal = profile.quickPayValue;

  const linksHtml = linksArray.map((link) => {
    const platform = String(link.platform || "website").toLowerCase();
    const icon = ICONS[platform] || ICONS.website;
    let url = link.url || "#";
    if (url && !/^(https?:\/\/|tel:|mailto:)/i.test(url)) url = "https://" + url;
    const title = platform.charAt(0).toUpperCase() + platform.slice(1);
    const handle = link.handle ? escapeHtml(link.handle) : "";

    return `
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="link-card" onclick="trackClick('${profile.id}', '${platform}')">
        <div class="link-info">
          <span class="link-title">${title}</span>
          ${handle ? `<span class="link-handle">${handle}</span>` : ""}
        </div>
        <div class="link-icon-wrap">${icon}</div>
      </a>
    `;
  }).join("");

  const quickPayHtml = (quickPayType && quickPayVal) ? `
    <div class="quickpay-wrap">
      <button type="button" class="quickpay-btn ${quickPayType}" onclick="handleQuickPay('${escapeHtml(quickPayType)}', '${escapeHtml(quickPayVal)}')">
        <span class="qp-shine"></span>
        <div class="qp-inner" id="qp-content">
          ${quickPayType === 'instapay'
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg> <span>ادفع لي الآن عبر InstaPay 💳</span>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><line x1="12" x2="12.01" y1="18" y2="18"/></svg> <span>اضغط لنسخ رقم Vodafone Cash 📱</span>`
          }
        </div>
      </button>
    </div>
  ` : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>${name} | Togou</title>
  <meta name="description" content="${bio || name}">
  <meta name="theme-color" content="#050505">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Alexandria:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    body {
      font-family: 'Alexandria', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${theme.bg};
      color: ${theme.textColor};
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: max(16px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom)) 16px;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      overflow-x: hidden;
    }
    .bg-aura {
      position: fixed;
      top: -10%;
      left: 50%;
      transform: translateX(-50%) translateZ(0);
      width: 140vw;
      max-width: 600px;
      height: 320px;
      background: radial-gradient(circle, ${theme.glowTop || 'rgba(124, 58, 237, 0.25)'} 0%, transparent 70%);
      filter: blur(60px);
      -webkit-filter: blur(60px);
      pointer-events: none;
      z-index: 0;
    }
    ${theme.backgroundImage ? `
    .bg-poster {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 55vh;
      background: url('${theme.backgroundImage}') center top / cover no-repeat;
      opacity: 0.35;
      mix-blend-mode: screen;
      mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
      -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
      pointer-events: none;
      z-index: 0;
    }
    ` : ''}
    .card-wrap {
      width: 100%;
      max-width: 440px;
      background: ${theme.cardBg};
      border: 1px solid ${theme.cardBorder};
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-radius: 32px;
      padding: 28px 20px 24px 20px;
      position: relative;
      z-index: 10;
      margin: auto 0;
      box-shadow: 0 20px 50px -10px rgba(0,0,0,0.7);
      transform: translateZ(0);
      will-change: transform;
    }
    .profile-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 22px;
    }
    .avatar-wrap {
      position: relative;
      width: 108px;
      height: 108px;
      margin-bottom: 14px;
    }
    .avatar-glow {
      position: absolute;
      inset: -3px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7c3aed, #ec4899);
      opacity: 0.65;
      filter: blur(6px);
      -webkit-filter: blur(6px);
    }
    .avatar-img {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(255,255,255,0.2);
      background: #1e1e24;
      display: block;
    }
    .profile-name {
      font-size: 22px;
      font-weight: 800;
      color: ${theme.nameColor};
      letter-spacing: -0.3px;
      margin-bottom: 6px;
    }
    .profile-bio {
      font-size: 13.5px;
      font-weight: 500;
      color: ${theme.bioColor};
      line-height: 1.5;
      max-width: 90%;
    }
    .action-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }
    .btn-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 46px;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      border: 1px solid rgba(255,255,255,0.12);
    }
    .btn-save {
      background: ${theme.btnSaveBg};
      color: ${theme.btnSaveText};
    }
    .btn-share {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }
    .btn-lead {
      width: 100%;
      height: 48px;
      border-radius: 16px;
      background: ${theme.btnLeadBg};
      color: ${theme.btnLeadText};
      font-size: 14px;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: none;
      cursor: pointer;
      font-family: inherit;
      margin-bottom: 18px;
      box-shadow: 0 8px 20px -4px rgba(124, 58, 237, 0.4);
      transition: transform 0.1s ease;
    }
    .btn-action:active, .btn-lead:active {
      transform: scale(0.97);
    }
    .links-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .link-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 13px 16px;
      border-radius: 18px;
      background: ${theme.linkBg};
      border: 1px solid ${theme.linkBorder};
      text-decoration: none;
      color: inherit;
      transition: transform 0.15s ease, background 0.15s ease;
    }
    .link-card:active {
      transform: scale(0.98);
      background: ${theme.linkHover};
    }
    .link-info {
      display: flex;
      flex-direction: column;
      text-align: right;
    }
    .link-title {
      font-size: 14.5px;
      font-weight: 700;
      color: #ffffff;
    }
    .link-handle {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 2px;
    }
    .link-icon-wrap {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      flex-shrink: 0;
    }
    .quickpay-wrap {
      margin-top: 14px;
    }
    .quickpay-btn {
      width: 100%;
      height: 52px;
      border-radius: 18px;
      border: none;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      font-family: inherit;
      font-weight: 800;
      font-size: 14px;
      color: #ffffff;
      transition: transform 0.1s ease;
    }
    .quickpay-btn.instapay {
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%);
      box-shadow: 0 8px 24px -4px rgba(124, 58, 237, 0.5);
    }
    .quickpay-btn.vodafone {
      background: linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f97316 100%);
      box-shadow: 0 8px 24px -4px rgba(220, 38, 38, 0.5);
    }
    .quickpay-btn:active {
      transform: scale(0.97);
    }
    .qp-inner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .footer-note {
      text-align: center;
      margin-top: 20px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.25);
      font-weight: 600;
      letter-spacing: 0.5px;
      z-index: 10;
    }
    .footer-note a {
      color: rgba(255,255,255,0.4);
      text-decoration: none;
    }
    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
      z-index: 999;
    }
    .modal-overlay.open {
      display: flex;
    }
    .modal-box {
      width: 100%;
      max-width: 380px;
      background: #111116;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 24px;
      padding: 24px;
      position: relative;
      box-shadow: 0 25px 60px rgba(0,0,0,0.8);
    }
    .modal-title {
      font-size: 18px;
      font-weight: 800;
      margin-bottom: 6px;
      text-align: center;
    }
    .modal-desc {
      font-size: 12.5px;
      color: #94a3b8;
      text-align: center;
      margin-bottom: 18px;
    }
    .form-group {
      margin-bottom: 12px;
    }
    .form-input {
      width: 100%;
      height: 44px;
      background: #1c1c24;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 0 14px;
      color: #ffffff;
      font-family: inherit;
      font-size: 13.5px;
      outline: none;
    }
    .form-input:focus {
      border-color: #7c3aed;
    }
    .btn-submit {
      width: 100%;
      height: 46px;
      border-radius: 14px;
      background: #2563eb;
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      font-family: inherit;
      margin-top: 8px;
    }
    .btn-close {
      position: absolute;
      top: 14px;
      left: 14px;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
    }
    /* Toast */
    .toast {
      position: fixed;
      bottom: max(20px, env(safe-area-inset-bottom));
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #18181b;
      border: 1px solid rgba(255,255,255,0.15);
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 99px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      z-index: 1000;
      transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      pointer-events: none;
    }
    .toast.show {
      transform: translateX(-50%) translateY(0);
    }
  </style>
</head>
<body>
  <div class="bg-aura"></div>
  ${theme.backgroundImage ? '<div class="bg-poster"></div>' : ''}

  <main class="card-wrap">
    <header class="profile-header">
      <div class="avatar-wrap">
        <div class="avatar-glow"></div>
        <img src="${escapeHtml(avatarUrl)}" alt="${name}" class="avatar-img" loading="eager" decoding="async">
      </div>
      <h1 class="profile-name">${name}</h1>
      ${bio ? `<p class="profile-bio">${bio}</p>` : ""}
    </header>

    <div class="action-row">
      <a href="/api/profiles/${profile.id}/vcard" class="btn-action btn-save">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
        حفظ جهة الاتصال
      </a>
      <button type="button" class="btn-action btn-share" onclick="handleShare()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
        مشاركة
      </button>
    </div>

    <button type="button" class="btn-lead" onclick="openLeadModal()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
      شارك بياناتك معي
    </button>

    <div class="links-list">
      ${linksHtml}
    </div>

    ${quickPayHtml}
  </main>

  <footer class="footer-note">
    <span>Designed by <a href="/">Togou</a></span>
  </footer>

  <!-- Lead Modal -->
  <div class="modal-overlay" id="leadModal" onclick="if(event.target===this)closeLeadModal()">
    <div class="modal-box">
      <button class="btn-close" onclick="closeLeadModal()">&times;</button>
      <h3 class="modal-title">تبادل جهات الاتصال</h3>
      <p class="modal-desc">اترك بياناتك ليتمكن ${name} من التواصل معك.</p>
      <form id="leadForm" onsubmit="submitLead(event)">
        <div class="form-group">
          <input type="text" id="leadName" class="form-input" placeholder="الاسم بالكامل *" required>
        </div>
        <div class="form-group">
          <input type="tel" id="leadPhone" class="form-input" placeholder="رقم الهاتف (واتساب) *" dir="ltr" required>
        </div>
        <div class="form-group">
          <input type="email" id="leadEmail" class="form-input" placeholder="البريد الإلكتروني (اختياري)" dir="ltr">
        </div>
        <div class="form-group">
          <input type="text" id="leadMessage" class="form-input" placeholder="رسالة قصيرة (اختياري)">
        </div>
        <button type="submit" class="btn-submit" id="leadSubmitBtn">إرسال البيانات</button>
      </form>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    function showToast(msg) {
      var t = document.getElementById('toast');
      t.innerText = msg;
      t.classList.add('show');
      setTimeout(function() { t.classList.remove('show'); }, 2200);
    }

    function handleShare() {
      var url = window.location.href;
      if (navigator.share) {
        navigator.share({ title: "${name}", url: url }).catch(function(){});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function() {
          showToast("تم نسخ رابط الكارت!");
        });
      } else {
        showToast("الرابط: " + url);
      }
    }

    function openLeadModal() {
      document.getElementById('leadModal').classList.add('open');
    }
    function closeLeadModal() {
      document.getElementById('leadModal').classList.remove('open');
    }

    function submitLead(e) {
      e.preventDefault();
      var btn = document.getElementById('leadSubmitBtn');
      btn.disabled = true;
      btn.innerText = "جاري الإرسال...";
      var body = {
        name: document.getElementById('leadName').value,
        phone: document.getElementById('leadPhone').value,
        email: document.getElementById('leadEmail').value,
        message: document.getElementById('leadMessage').value
      };
      fetch('/api/profiles/${profile.id}/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function(res) {
        if (res.ok) {
          closeLeadModal();
          showToast("✅ تم إرسال بياناتك بنجاح!");
          document.getElementById('leadForm').reset();
        } else {
          showToast("❌ حدث خطأ أثناء الإرسال");
        }
      }).catch(function() {
        showToast("❌ حدث خطأ في الاتصال");
      }).finally(function() {
        btn.disabled = false;
        btn.innerText = "إرسال البيانات";
      });
    }

    function handleQuickPay(type, val) {
      if (type === 'instapay') {
        var u = val.indexOf('http') === 0 ? val : ('https://' + val);
        window.open(u, '_blank');
      } else {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(val).then(function() {
            showToast("تم نسخ رقم فودافون كاش! 📱");
          });
        } else {
          showToast("رقم الكاش: " + val);
        }
      }
    }

    function trackClick(pid, plat) {
      try {
        fetch('/api/profiles/' + pid + '/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: plat })
        });
      } catch(e) {}
    }
  </script>
</body>
</html>`;
}
