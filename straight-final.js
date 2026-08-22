(() => {
  const core = document.createElement('script');
  core.src = 'straight-final-core.js?v=1.0.0';
  core.async = false;
  core.onload = () => {
    const hireOptions = document.createElement('script');
    hireOptions.src = 'hire-options.js?v=1.0.0';
    hireOptions.async = false;
    hireOptions.onload = () => {
      const finalPolish = document.createElement('script');
      finalPolish.src = 'hire-options-final-polish.js?v=1.0.2';
      finalPolish.async = false;
      finalPolish.onload = () => {
        const bookingPolicy = document.createElement('script');
        bookingPolicy.src = 'booking-policy-final.js?v=1.0.0';
        bookingPolicy.async = false;
        bookingPolicy.onload = () => {
          const emailOptions = document.createElement('script');
          emailOptions.src = 'hire-options-email.js?v=1.0.3';
          emailOptions.async = false;
          document.body.appendChild(emailOptions);
        };
        document.body.appendChild(bookingPolicy);
      };
      document.body.appendChild(finalPolish);
    };
    document.body.appendChild(hireOptions);
  };
  document.body.appendChild(core);
})();
