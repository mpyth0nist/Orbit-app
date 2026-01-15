import React, { useRef, useEffect } from 'react';

const GoogleSignInButton = ({ onSuccess, onError }) => {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (window.google && buttonRef.current) {
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: '100%'
      });
    }
  }, []);

  return <div ref={buttonRef} />;
};

export default GoogleSignInButton;
 