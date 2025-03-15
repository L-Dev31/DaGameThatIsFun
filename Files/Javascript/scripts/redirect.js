export function execute(payload) {
    console.log('Executing redirect command:', payload);
    if (payload.force || window.location.pathname !== new URL(payload.url).pathname) {
      console.log('Performing redirect to:', payload.url);
      sessionStorage.setItem('isRedirecting', 'true');
      window.location.href = payload.url;
    } else {
      console.log('Redirect not needed, already on target page');
    }
  }