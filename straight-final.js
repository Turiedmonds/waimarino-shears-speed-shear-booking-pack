(() => {
  const core = document.createElement('script');
  core.src = 'straight-final-core.js?v=1.0.0';
  core.async = false;
  core.onload = () => {
    const initialCopySync = document.createElement('script');
    initialCopySync.src = 'initial-copy-sync.js?v=1.0.2';
    initialCopySync.async = false;
    initialCopySync.onload = () => {
      const hireOptions = document.createElement('script');
      hireOptions.src = 'hire-options.js?v=1.0.1';
      hireOptions.async = false;
      hireOptions.onload = () => {
        const finalPolish = document.createElement('script');
        finalPolish.src = 'hire-options-final-polish.js?v=1.0.3';
        finalPolish.async = false;
        finalPolish.onload = () => {
          const bookingPolicy = document.createElement('script');
          bookingPolicy.src = 'booking-policy-final.js?v=1.0.0';
          bookingPolicy.async = false;
          bookingPolicy.onload = () => {
            const bookingDateRules = document.createElement('script');
            bookingDateRules.src = 'booking-date-rules.js?v=1.0.0';
            bookingDateRules.async = false;
            bookingDateRules.onload = () => {
              const cleanShearTimeUi = document.createElement('script');
              cleanShearTimeUi.src = 'clean-shear-time-ui.js?v=1.0.1';
              cleanShearTimeUi.async = false;
              cleanShearTimeUi.onload = () => {
                const boardJudgeHelp = document.createElement('script');
                boardJudgeHelp.src = 'board-judge-help.js?v=1.1.0';
                boardJudgeHelp.async = false;
                boardJudgeHelp.onload = () => {
                  const emailOptions = document.createElement('script');
                  emailOptions.src = 'hire-options-email.js?v=1.0.4';
                  emailOptions.async = false;
                  document.body.appendChild(emailOptions);
                };
                document.body.appendChild(boardJudgeHelp);
              };
              document.body.appendChild(cleanShearTimeUi);
            };
            document.body.appendChild(bookingDateRules);
          };
          document.body.appendChild(bookingPolicy);
        };
        document.body.appendChild(finalPolish);
      };
      document.body.appendChild(hireOptions);
    };
    document.body.appendChild(initialCopySync);
  };
  document.body.appendChild(core);
})();