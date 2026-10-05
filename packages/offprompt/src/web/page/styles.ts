import { fontFaces } from '../fonts.js'

/**
 * One stylesheet for every page. It sits in the page under the response's nonce, because
 * the page loads nothing, and colours that vary by provider are drawn as SVG fills rather
 * than inline styles, which the policy refuses.
 */
const RULES = `
  :root {
    color-scheme: light;
    --bg: #FBFBF9; --surface: #FFFFFF; --surface-head: #FCFCFB; --sunken: #F3F4F1; --skeleton: #ECEEEA;
    --line: #E4E6E1; --line-strong: #D6DAD4;
    --ink: #12332A; --ink-2: #4D6158; --ink-3: #6B7770; --ink-4: #B5BDB8;
    --brand: #2B4A3B; --brand-2: #3F5E4F; --off: #E6E9E5;
    --ok: #2F9E5B; --ok-bg: #E3F2E8; --ok-ink: #2E7D53; --ok-text: #237A45;
    --bad: #D14B3B; --bad-bg: #FBE5E1; --bad-field: #FFFBFA; --bad-ink: #8E2F23; --bad-text: #B83A2A;
    --warn: #C4870F; --warn-bg: #FBF0D9; --warn-ink: #8A5E09;
    /* The bright tones are for dots, icons and borders; text in a status colour takes these darker ones. */
    --ease-out: cubic-bezier(0.23, 1, 0.32, 1); --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
    --sans: 'Geist', system-ui, sans-serif; --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  body { margin: 0; min-height: 100vh; background: var(--bg); color: var(--ink);
         font: 14px/1.45 var(--sans); -webkit-font-smoothing: antialiased; }
  p { margin: 0; }
  a { color: inherit; }
  .mono, code, kbd { font-family: var(--mono); }
  .sprite { position: absolute; width: 0; height: 0; overflow: hidden; }
  .icon { width: 16px; height: 16px; flex: none; fill: none; stroke: currentColor; stroke-width: 2;
          stroke-linecap: round; stroke-linejoin: round; }
  .mark { width: 30px; height: 15px; flex: none; fill: currentColor; }
  .mark .ring { fill: none; stroke: currentColor; stroke-width: 2.25; }

  .topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; height: 56px;
            padding: 0 28px; border-bottom: 1px solid var(--line); background: var(--bg); }
  .brand { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 500; letter-spacing: -0.3px; }
  .session { display: flex; align-items: center; gap: 16px; min-width: 0; }
  .status { min-width: 0; overflow: hidden; font-size: 13px; color: var(--ink-2); white-space: nowrap; text-overflow: ellipsis; }
  .status::before { content: ''; display: inline-block; width: 7px; height: 7px; margin: 0 8px 1px 0; border-radius: 50%;
                    background: var(--ok); }
  .status[data-state=lost]::before { background: var(--warn); }
  .status[data-state=closed]::before { background: var(--bad); }
  .status[data-state=idle]::before { background: var(--ink-4); }
  .divider { width: 1px; height: 16px; flex: none; background: var(--line); }
  .host { font-family: var(--mono); font-size: 12px; color: var(--ink-3); white-space: nowrap; }
  .session .status:empty, .session .status[hidden] + .divider, .session .status:empty + .divider { display: none; }

  main { width: min(560px, 100% - 40px); margin: 0 auto; padding: 64px 0 96px;
         display: flex; flex-direction: column; gap: 20px; }

  .request { display: flex; flex-direction: column; gap: 16px; margin-bottom: 4px; }
  .requester { display: flex; align-items: center; gap: 12px; }
  .avatar { width: 36px; height: 36px; flex: none; }
  .avatar.plain { display: flex; align-items: center; justify-content: center; border-radius: 50%;
                  background: var(--sunken); color: var(--ink-2); }
  .avatar.plain .icon { width: 18px; height: 18px; }
  .who { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .agent { font-size: 14px; font-weight: 500; }
  .agent .via { color: var(--ink-3); font-weight: 400; }
  h1 { margin: 0; font-size: 32px; line-height: 37px; font-weight: 400; letter-spacing: -0.9px; }
  .claim { font-size: 16px; line-height: 25px; color: var(--ink-2); overflow-wrap: anywhere; }
  .claim > * { margin: 0 0 10px; }
  .claim > :last-child { margin-bottom: 0; }
  .claim ul, .claim ol { padding-left: 1.2rem; }
  .claim li + li { margin-top: 2px; }
  .claim strong { color: var(--ink); font-weight: 500; }
  .claim code { font-size: 0.86em; padding: 1px 5px; border-radius: 5px; background: var(--sunken); color: var(--ink); }
  .claim pre { padding: 10px 12px; border-radius: 8px; overflow-x: auto; background: var(--sunken); font-size: 13px; }
  .claim pre code { padding: 0; background: none; }
  .claim blockquote { padding-left: 12px; border-left: 2px solid var(--line-strong); }

  .card { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; }
  .round-icon { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex: none;
                border: 1px solid var(--line); border-radius: 50%; color: var(--ink); }
  .round-icon .icon { width: 17px; height: 17px; }
  .target { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
  .target-text { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
  .target-label { font-size: 12px; color: var(--ink-3); }
  .path { display: flex; align-items: baseline; flex-wrap: wrap; column-gap: 8px; min-width: 0; }
  .file { font-family: var(--mono); font-size: 15px; font-weight: 500; overflow-wrap: anywhere; }
  .dir { font-family: var(--mono); font-size: 12px; color: var(--ink-3); overflow-wrap: anywhere; }
  .who .dir { overflow-wrap: normal; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .state { display: flex; align-items: center; gap: 7px; flex: none; font-size: 13px; color: var(--ink-3); }
  .state::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--ink-4); }
  .state.warn { color: var(--warn-ink); }
  .state.warn::before { background: var(--warn); }
  .state.bad { color: var(--bad-text); }
  .state.bad::before { background: var(--bad); }
  .sealed { display: flex; align-items: center; gap: 8px; margin-top: -8px; padding: 0 4px;
            font-size: 13px; color: var(--ink-2); }
  .sealed .icon { width: 14px; height: 14px; color: var(--ok-ink); }

  .import { display: flex; align-items: center; gap: 14px; padding: 12px 12px 12px 16px;
            background: var(--sunken); border: 1px solid var(--line); border-radius: 12px; }
  .square-icon { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex: none;
                 background: var(--surface); border: 1px solid var(--line); border-radius: 10px; }
  .square-icon .icon { width: 17px; height: 17px; }
  .import-text { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
  .import-title { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 500; }
  .import-text > p:last-child { font-size: 13px; line-height: 19px; color: var(--ink-2); }
  kbd { white-space: nowrap; padding: 1px 6px; font-size: 11px; font-weight: 400; color: var(--ink-2); background: var(--surface);
        border: 1px solid var(--line); border-radius: 5px; }
  .import-input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  .secondary { display: inline-flex; align-items: center; gap: 7px; flex: none; padding: 8px 12px;
               font: 500 13px var(--sans); color: var(--ink); background: var(--surface);
               border: 1px solid var(--line-strong); border-radius: 8px; box-shadow: 0 1px 2px #12332A0D; cursor: pointer; }
  .secondary .icon { width: 14px; height: 14px; }
  .import-input:focus-visible + .secondary { outline: 2px solid var(--brand); outline-offset: 2px; }
  .fill-status { padding: 10px 12px; border-radius: 8px; font-size: 13px; line-height: 18px;
                 background: var(--warn-bg); color: var(--warn-ink); }
  .fill-status:empty { display: none; }
  .import.filled { background: var(--ok-bg); border-color: #CFE6D7; }
  .import.filled .square-icon { border-color: #CFE6D7; color: var(--ok); }
  .import.filled .import-title { color: #1E5E38; }
  .import.filled .import-text > p:last-child { color: #2E6B45; }
  .page-notice:not(.warn) .lost-mark, .page-notice:not(.bad) .closed-mark, .page-notice:not(.ok) .written-mark { display: none; }
  .banner.ok { background: var(--ok-bg); color: #1E5E38; }
  .banner.ok > .icon { color: var(--ok); }
  .banner:focus { outline: none; }
  main:has(#page-notice:not([hidden])) section.import,
  main:has(form.writing) section.import, main:has(form.writing) .fill-status { display: none; }

  form { display: flex; flex-direction: column; gap: 20px; margin: 0; }
  .values { background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
            box-shadow: 0 1px 2px #12332A0A; overflow: hidden; }
  .values-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 22px;
                 background: var(--surface-head); border-bottom: 1px solid var(--line); font-size: 13px; }
  .count { color: var(--ink-3); }
  .count strong { margin-right: 4px; font-weight: 500; color: var(--ink); }
  .toggle { position: relative; display: inline-flex; flex: none; }
  .toggle input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
  .toggle label { display: inline-flex; align-items: center; gap: 9px; font-size: 13px; color: var(--ink-2);
                  cursor: pointer; user-select: none; }
  .toggle .icon { width: 15px; height: 15px; }
  .track { position: relative; width: 32px; height: 18px; border-radius: 9px; background: var(--line-strong);
           transition: background 0.15s; }
  .knob { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: #fff;
          box-shadow: 0 1px 2px #12332A33; transition: transform 0.15s; }
  .toggle input:checked + label .track { background: var(--brand); }
  .toggle input:checked + label .knob { transform: translateX(14px); }
  .toggle input:not(:checked) + label .when-on, .toggle input:checked + label .when-off { display: none; }
  .toggle input:not(:checked) + label .toggle-text::after { content: 'Show values'; }
  .toggle input:checked + label .toggle-text::after { content: 'Hide values'; }
  .toggle input:focus-visible + label { outline: 2px solid var(--brand); outline-offset: 3px; border-radius: 6px; }

  .field { display: flex; flex-direction: column; gap: 10px; padding: 20px 22px; }
  .field + .field { border-top: 1px solid var(--line); }
  .field-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 0; }
  .field-name { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .key { font-family: var(--mono); font-size: 14px; font-weight: 500; overflow-wrap: anywhere; }
  .tile { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; flex: none;
          border: 1px solid var(--line); border-radius: 6px; background: var(--surface); color: var(--ink-2); }
  .tile .icon { width: 14px; height: 14px; }
  .tile .logo { width: 13px; height: 13px; color: #000; }
  .tile.initial { font-size: 12px; font-weight: 600; color: #000; }
  svg.tile { border: 0; padding: 0; }
  .aside, .get { display: inline-flex; align-items: center; gap: 4px; min-width: 0; font-size: 13px;
                 color: var(--ink-2); white-space: nowrap; }
  .aside { overflow: hidden; text-overflow: ellipsis; color: var(--ink-3); }
  .get { flex: none; text-decoration: none; }
  .get:hover span { text-decoration: underline; text-underline-offset: 3px; }
  .get .icon { width: 14px; height: 14px; }
  .caption { font-size: 13px; line-height: 18px; color: var(--ink-2); }

  .input { display: flex; align-items: center; gap: 8px; padding: 0 12px 0 14px; background: var(--surface);
           border-radius: 10px; box-shadow: inset 0 0 0 1px var(--line-strong); }
  .input:focus-within { box-shadow: inset 0 0 0 1.5px var(--brand); }
  .input:has(textarea.valid) { box-shadow: inset 0 0 0 1px var(--ok); }
  .input:focus-within:has(textarea.valid) { box-shadow: inset 0 0 0 1.5px var(--ok); }
  .input:has(textarea.invalid) { box-shadow: inset 0 0 0 1px var(--bad); background: var(--bad-field); }
  .input:focus-within:has(textarea.invalid) { box-shadow: inset 0 0 0 1.5px var(--bad); }
  .input .icon { width: 16px; height: 16px; }
  .ok-mark, .bad-mark { display: none; }
  .input:has(textarea.valid) .ok-mark { display: block; color: var(--ok); }
  .input:has(textarea.invalid) .bad-mark { display: block; color: var(--bad); }
  textarea {
    display: block; flex: 1; min-width: 0; height: 48px; margin: 0; padding: 14px 0; border: 0; outline: 0;
    background: transparent; color: var(--ink); resize: none; font: 14px/20px var(--mono);
  }
  textarea::placeholder { color: var(--ink-3); opacity: 1; }
  textarea[data-single-line] { white-space: pre; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; }
  textarea[data-single-line]::-webkit-scrollbar { display: none; }
  .input.multi { align-items: flex-start; }
  .input.multi textarea { height: auto; min-height: 8rem; resize: vertical; }
  .input.multi .icon { margin-top: 16px; }
  textarea.secret { -webkit-text-security: disc; }
  form:has(#reveal-all:checked) textarea.secret, textarea.secret.shown { -webkit-text-security: none; }
  /* Where the property is missing the fields still hide their values, rather than showing them. */
  @supports not (-webkit-text-security: disc) {
    textarea.secret { color: transparent; caret-color: var(--ink); }
    form:has(#reveal-all:checked) textarea.secret, textarea.secret.shown { color: inherit; }
  }
  .input:has(textarea.spaced):not(:has(textarea.invalid)) { box-shadow: inset 0 0 0 1px var(--warn); }
  .reveal { display: flex; padding: 4px; margin: 0 -4px; border: 0; border-radius: 6px; background: none;
            color: var(--ink-3); cursor: pointer; }
  .reveal:hover { color: var(--ink-2); }
  .reveal:focus-visible { outline: 2px solid var(--brand); }
  .reveal .when-on,
  .input:has(textarea.shown) .reveal .when-off,
  form:has(#reveal-all:checked) .reveal .when-off { display: none; }
  .input:has(textarea.shown) .reveal .when-on,
  form:has(#reveal-all:checked) .reveal .when-on { display: block; }
  .act { display: inline-flex; align-items: center; gap: 6px; flex: none; padding: 5px 10px; margin-right: -4px;
         font: 500 13px var(--sans); color: var(--ink); background: var(--sunken); border: 1px solid var(--line);
         border-radius: 7px; cursor: pointer; white-space: nowrap; }
  .act:hover { border-color: var(--line-strong); }
  .act:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
  .act .icon { width: 14px; height: 14px; }
  .pick { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--ink-3); }
  .pick input { max-width: 100%; font: 13px var(--sans); color: var(--ink-3); }
  .pick input::file-selector-button { margin-right: 10px; padding: 6px 10px; font: 500 13px var(--sans); color: var(--ink);
                                      background: var(--surface); border: 1px solid var(--line-strong); border-radius: 7px;
                                      cursor: pointer; }

  .rules { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px;
           font-size: 13px; color: var(--ink-3); }
  .rules li { display: flex; align-items: center; gap: 8px; }
  .rules li > span::first-letter { text-transform: uppercase; }
  .rules .icon { width: 14px; height: 14px; color: var(--ink-4); }
  .rules .pass-mark, .rules .fail-mark, .rules li.pass .idle-mark, .rules li.fail .idle-mark { display: none; }
  .rules li.pass { color: var(--ink-2); }
  .rules li.pass .pass-mark { display: block; color: var(--ok); }
  .rules li.fail { color: var(--bad-text); }
  .rules li.fail .fail-mark { display: block; color: var(--bad); }
  .rules:not(:has(li:not([hidden]))) { display: none; }
  .hint { font-size: 13px; line-height: 18px; color: var(--ink-3); }
  .hint.bad { color: var(--bad-text); }
  .summary, .space-note { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; line-height: 18px; }
  .summary { color: var(--ok-text); }
  .space-note { gap: 6px; color: var(--warn-ink); }
  .summary .icon, .space-note .icon { width: 14px; height: 14px; margin-top: 2px; }
  .summary .icon { color: var(--ok); }
  .space-note .icon { color: var(--warn); }
  .summary .file-mark, .summary.from-file .typed-mark { display: none; }
  .summary.from-file .file-mark { display: block; }
  .notice { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: 8px;
            font-size: 13px; line-height: 18px; background: var(--warn-bg); color: var(--warn-ink); }
  .notice .icon { width: 15px; height: 15px; margin-top: 1.5px; color: var(--warn); }
  .offers { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 13px; color: var(--ink-3); }
  a.offer { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px 3px 7px; font-size: 12.5px;
            color: var(--ink); text-decoration: none; border: 1px solid var(--line); border-radius: 999px; }
  a.offer:hover { border-color: var(--line-strong); background: var(--sunken); }
  a.offer .logo { width: 12px; height: 12px; }
  .static { min-height: 48px; padding: 0 14px; color: var(--ink-3); font: 13.5px/20px var(--mono); background: var(--sunken); }

  .banner { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border-radius: 12px; font-size: 13.5px;
            line-height: 20px; }
  .banner > .icon { width: 18px; height: 18px; margin-top: 1px; }
  .banner-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .banner-title { font-size: 14.5px; font-weight: 500; }
  .banner-text > p:not(.banner-title)::first-letter { text-transform: uppercase; }
  .banner.bad { background: var(--bad-bg); color: var(--bad-ink); }
  .banner.bad > .icon { color: var(--bad); }
  .banner.warn { background: var(--warn-bg); color: var(--warn-ink); }
  .banner.warn > .icon { color: var(--warn); }
  .override { display: flex; align-items: flex-start; gap: 8px; margin-top: 4px; font-weight: 500; cursor: pointer; }
  .override input { margin: 3px 0 0; accent-color: var(--bad); }

  .actions { display: flex; flex-direction: column; gap: 12px; }
  .progress { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 4px 4px 0;
              font-size: 13px; color: var(--ink-2); }
  .progress > span:nth-child(2) { flex: 1; }
  .bar { position: relative; width: 120px; height: 4px; flex: none; overflow: hidden; border-radius: 2px;
         background: var(--line); }
  .bar-fill { position: absolute; inset: 0 auto 0 0; width: 0; border-radius: 2px; background: var(--ok);
              transition: width 0.25s ease-out; }
  .progress-note { font-weight: 500; }
  .progress-note.bad { color: var(--bad-text); }
  button { font: inherit; }
  .primary { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; height: 52px;
             padding: 0 20px; border: 0; border-radius: 10px; background: var(--brand); color: #fff;
             font: 500 15px var(--sans); box-shadow: 0 6px 16px #2B4A3B2E; cursor: pointer; }
  .primary:hover { background: var(--brand-2); }
  .primary:focus-visible { outline: 2px solid var(--brand); outline-offset: 3px; }
  .primary:disabled { background: var(--off); color: var(--ink-3); box-shadow: none; cursor: not-allowed; }
  .primary .icon { width: 17px; height: 17px; }
  .primary .spin, .primary .retry-icon, .primary .button-kbd, .primary.waiting .button-icon:not(.spin),
  .primary.retry .button-icon:not(.retry-icon) { display: none; }
  .primary.retry .retry-icon { display: block; }
  .primary.retry .button-kbd { display: inline-block; }
  .button-kbd { padding: 2px 6px; font-size: 11px; color: #FFFFFFCC; background: #FFFFFF24; border: 0; }
  .failure { align-self: flex-start; margin-top: 4px; padding: 6px 8px; border-radius: 6px; background: #FFFFFF99;
             font-size: 12px; overflow-wrap: anywhere; }
  .primary.waiting .spin { display: block; animation: spin 0.9s linear infinite; }
  .primary.busy:disabled { background: var(--brand-2); color: #fff; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .primary.waiting .spin { animation: none; } .bar-fill { transition: none; } }
  form.writing .input { background: var(--sunken); box-shadow: inset 0 0 0 1px var(--line); }
  form.writing textarea { color: var(--ink-2); }
  form.writing .reveal, form.writing .act { display: none; }

  .facts { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 16px; margin: 8px 0 0; padding: 0;
           list-style: none; font-size: 12.5px; color: var(--ink-3); }
  .facts li { display: flex; align-items: center; gap: 6px; }
  .facts .icon { width: 13px; height: 13px; }
  .drop-overlay { position: fixed; inset: 56px 0 0; z-index: 10; display: flex; align-items: center; justify-content: center;
                  padding: 20px; background: #F3F4F1E0; -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); }
  .drop-card { display: flex; flex-direction: column; align-items: center; gap: 14px; width: min(560px, 100%);
               padding: 44px 40px 40px; text-align: center; pointer-events: none; background: #FFFFFFF5;
               border: 2px solid var(--brand); border-radius: 20px; box-shadow: 0 24px 56px #12332A26; }
  .drop-icon { display: flex; align-items: center; justify-content: center; width: 64px; height: 64px;
               border-radius: 18px; background: var(--ok-bg); color: var(--brand); }
  .drop-icon .icon { width: 28px; height: 28px; stroke-width: 1.75; }
  .drop-title { font-size: 26px; letter-spacing: -0.6px; }
  .drop-card > p:not(.drop-title) { max-width: 440px; font-size: 15px; line-height: 23px; color: var(--ink-2); }
  .chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin: 0; padding: 8px 0 0; list-style: none; }
  .chips li { padding: 4px 8px; border-radius: 6px; background: var(--sunken); font: 11.5px var(--mono); color: var(--ink-2); }

  main.centered { align-items: center; gap: 16px; padding-top: 72px; }
  .hero-tile { padding: 7px; background: var(--skeleton); border: 1px solid var(--line); border-radius: 28px; }
  .hero-tile > div { display: flex; align-items: center; justify-content: center; width: 84px; height: 84px;
                     border-radius: 20px; background: var(--brand); color: #fff; box-shadow: 0 12px 26px #12332A40; }
  .hero-tile .mark { width: 46px; height: 23px; }
  .hero-tile.muted > div { background: var(--ink-4); box-shadow: none; }
  .to-check { overflow: visible; }
  .to-check circle { transform-box: fill-box; transform-origin: center;
                     animation: gather 340ms var(--ease-in-out) var(--delay) both, vanish 1ms 1050ms forwards; }
  .to-check circle:nth-of-type(1) { --delay: 350ms; --to: translate(5px, -5.5px) scale(0.5); }
  .to-check circle:nth-of-type(2) { --delay: 390ms; --to: translate(2.5px, 14px) scale(0.5); }
  .to-check circle:nth-of-type(3) { --delay: 430ms; --to: translate(-0.75px, -5.25px) scale(0.5); }
  .to-check circle:nth-of-type(4) { --delay: 470ms; --to: translate(-4px, -13.5px) scale(0.5); }
  .to-check .ring { fill: currentColor; fill-opacity: 0;
                    animation: gather 340ms var(--ease-in-out) var(--delay) both, fill-in 340ms var(--ease-in-out) var(--delay) both,
                               vanish 1ms 1050ms forwards; }
  .to-check .check { fill: none; stroke: currentColor; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round;
                     stroke-dasharray: 1 2; stroke-dashoffset: 1.05; animation: draw 260ms var(--ease-out) 750ms forwards; }
  @keyframes gather { to { transform: var(--to); } }
  @keyframes fill-in { to { fill-opacity: 1; } }
  @keyframes vanish { to { opacity: 0; } }
  @keyframes draw { to { stroke-dashoffset: 0; } }
  @keyframes appear { to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .to-check circle, .to-check .ring { animation: vanish 160ms ease-out 350ms forwards; }
    .to-check .check { stroke-dashoffset: 0; opacity: 0; animation: appear 240ms ease-out 450ms forwards; }
  }
  .hero { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 20px 0 12px; text-align: center; }
  .hero h1 { font-size: 52px; line-height: 1.1; letter-spacing: -1.8px; }
  .hero h1.headline { font-size: 28px; line-height: 34px; letter-spacing: -0.6px; }
  .hero p { max-width: 420px; font-size: 17px; line-height: 26px; color: var(--ink-2); }

  .fingerprint { display: flex; flex-direction: column; align-items: center; gap: 18px; width: 100%; padding: 24px;
                 background: var(--surface); border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 12px 32px #12332A14; }
  .eyebrow { display: flex; align-items: center; gap: 7px; font: 11.5px var(--mono); letter-spacing: 1.2px;
             text-transform: uppercase; color: var(--ok-ink); }
  .eyebrow .icon { width: 14px; height: 14px; }
  .emoji { display: flex; gap: 12px; margin: 0; padding: 0; list-style: none; }
  .emoji li { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .emoji .glyph { display: flex; align-items: center; justify-content: center; width: 72px; height: 72px;
                  background: var(--sunken); border: 1px solid var(--line); border-radius: 16px; font-size: 38px; line-height: 1; }
  .emoji .name { font: 11px var(--mono); color: var(--ink-3); }
  /* A monospace face may draw ☕ or ⌛ as a small text glyph; these take the colour emoji. */
  .emoji .glyph, .glyphs { font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif; }
  .explainer { max-width: 440px; font-size: 13.5px; line-height: 20px; color: var(--ink-2); text-align: center; }
  .rule { width: 100%; height: 1px; background: var(--line); }
  .look { display: flex; flex-direction: column; gap: 10px; width: 100%; }
  .look-label { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; }
  .look-label .icon { width: 14px; height: 14px; }
  .terminal { overflow: hidden; background: #0C0C0C; border: 1px solid #262626; border-radius: 10px;
              font: 12.5px/20px var(--mono); color: #8A8A8A; }
  .terminal-bar { position: relative; display: flex; align-items: center; gap: 7px; height: 32px; padding: 0 12px;
                  border-bottom: 1px solid #262626; }
  .terminal-bar i { width: 9px; height: 9px; border-radius: 50%; background: #2E2E2E; }
  .terminal-bar span { position: absolute; left: 60px; right: 60px; overflow: hidden; text-align: center; white-space: nowrap;
                       text-overflow: ellipsis; font-size: 11px; color: #5C5C5C; }
  .terminal-body { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px 16px; }
  .terminal-body p { display: flex; gap: 9px; }
  .terminal-body .tool { color: #E6E6E6; font-weight: 600; }
  .terminal-body .dot { color: #7CF5C2; }
  .terminal-body .dot.reply { color: #D97757; }
  .terminal-body .said { color: #E6E6E6; }
  .terminal-body .result { display: flex; flex-direction: column; padding-left: 10px; }
  .terminal-body span { overflow-wrap: anywhere; }
  .chip { display: inline-flex; gap: 5px; margin-left: 8px; padding: 0 7px; border: 1px solid #7CF5C2; border-radius: 6px;
          background: #7CF5C21A; }
  .same { display: flex; align-items: flex-start; gap: 7px; padding: 2px 2px 0; font-size: 12.5px; line-height: 18px;
          color: var(--ink-2); }
  .same .icon { width: 14px; height: 14px; margin-top: 2px; color: var(--ok); }

  .receipt { width: 100%; overflow: hidden; background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
             box-shadow: 0 12px 32px #12332A14; }
  .receipt-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--line); }
  .receipt-head .round-icon { width: 34px; height: 34px; }
  .receipt-head .round-icon .icon { width: 16px; height: 16px; }
  .receipt-head .path { flex: 1; }
  .pill { display: inline-flex; align-items: center; gap: 6px; flex: none; padding: 5px 11px; border-radius: 999px;
          font-size: 13px; font-weight: 500; background: var(--ok-bg); color: var(--ok-text); }
  .pill .icon { width: 14px; height: 14px; }
  .receipt ul { margin: 0; padding: 0; list-style: none; }
  .receipt li { display: flex; align-items: center; gap: 10px; padding: 11px 16px; }
  .receipt li + li { border-top: 1px solid var(--line); }
  .receipt .key { flex: 1; font-size: 13.5px; font-weight: 400; }
  .receipt .done { font-size: 13px; color: var(--ink-3); }
  .receipt .done.replaced { color: var(--warn-ink); }
  .receipt li > .icon { width: 15px; height: 15px; color: var(--ok); }
  .closing { display: flex; flex-direction: column; align-items: center; gap: 6px; padding-top: 16px; text-align: center; }
  .closing p:first-child { font-size: 15px; font-weight: 500; }
  .closing p:last-child { font-size: 13.5px; color: var(--ink-3); }

  @media (max-width: 640px) {
    .topbar { padding: 0 16px; }
    .target { flex-wrap: wrap; }
    .target .state { flex: 1 1 100%; padding-left: 48px; white-space: normal; }
    .field-head { flex-wrap: wrap; row-gap: 4px; }
    .host, .divider { display: none; }
    main { padding-top: 40px; }
    h1 { font-size: 26px; line-height: 31px; }
    .field { padding: 18px 16px; }
    .values-head { padding: 12px 16px; }
    .import { flex-wrap: wrap; }
    .import-text { flex: 1 1 200px; }
    .import .secondary { margin-left: 50px; }
    .emoji { flex-wrap: wrap; justify-content: center; gap: 8px; }
    .emoji .glyph { width: 56px; height: 56px; font-size: 30px; }
    .fingerprint { padding: 20px 16px; }
  }
`

export const STYLES = `${fontFaces}\n${RULES}`
