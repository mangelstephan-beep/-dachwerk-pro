(() => {
  if (document.getElementById('dwp-green-button-theme')) return;
  const style = document.createElement('style');
  style.id = 'dwp-green-button-theme';
  style.textContent = `
    :root{--dwp-action-green:#1c8a5a;--dwp-action-green-dark:#126b43;--dwp-action-green-soft:#eaf7f0;--dwp-action-green-border:#8fd0af}
    .button,.page-nav-button,.quick-action,.text-button,.input-action,.icon-button,.profile-button,.nav-item[data-view],button[data-action],button[data-go],button[data-work-action],button[data-source-action],button[data-price-import],button[data-price-add],button[data-material-save],button[data-voice-btn]{transition:background .16s ease,border-color .16s ease,color .16s ease,transform .16s ease}
    .button,.button-primary,.button-secondary,.button-f3,.page-nav-button,.quick-action,button[data-action],button[data-go],button[data-work-action],button[data-source-action],button[data-price-import],button[data-price-add],button[data-material-save],button[data-voice-btn]{background:var(--dwp-action-green)!important;border-color:var(--dwp-action-green)!important;color:#fff!important;box-shadow:0 7px 16px rgba(28,138,90,.16)}
    .button:hover,.button-primary:hover,.button-secondary:hover,.button-f3:hover,.page-nav-button:hover,.quick-action:hover,button[data-action]:hover,button[data-go]:hover,button[data-work-action]:hover,button[data-source-action]:hover,button[data-price-import]:hover,button[data-price-add]:hover,button[data-material-save]:hover,button[data-voice-btn]:hover{background:var(--dwp-action-green-dark)!important;border-color:var(--dwp-action-green-dark)!important;color:#fff!important}
    .text-button{color:var(--dwp-action-green)!important}
    .input-action{color:var(--dwp-action-green)!important}
    .nav-item.is-active{background:var(--dwp-action-green-soft)!important;color:var(--dwp-action-green-dark)!important}
    .nav-item.is-active .nav-symbol{background:var(--dwp-action-green)!important;border-color:var(--dwp-action-green)!important;color:#fff!important}
    .status-pill.status-green{background:var(--dwp-action-green-soft)!important;color:var(--dwp-action-green-dark)!important}
    @media (max-width:760px){.button,.page-nav-button,.quick-action{min-height:46px}.header-actions{gap:8px;flex-wrap:wrap}.header-actions .button{flex:1 1 140px}.page-navigation{overflow-x:auto}.page-nav-button{white-space:nowrap}}
  `;
  document.head.appendChild(style);
})();