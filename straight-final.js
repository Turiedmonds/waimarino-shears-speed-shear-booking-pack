(() => {
  const core = document.createElement('script');
  core.src = 'straight-final-core.js?v=1.0.0';
  core.async = false;
  core.onload = () => {
    const hireOptions = document.createElement('script');
    hireOptions.src = 'hire-options.js?v=1.0.0';
    hireOptions.async = false;
    document.body.appendChild(hireOptions);
  };
  document.body.appendChild(core);
})();
