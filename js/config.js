(function (window) {
  'use strict';

  const hostname = (window.location && window.location.hostname) || '';
  const protocol = (window.location && window.location.protocol) || '';
  const searchParams = new URLSearchParams((window.location && window.location.search) || '');
  const forcedEnv = searchParams.get('env'); // ?env=dev ou ?env=prod

  const isLocalHost =
    protocol === 'file:' ||
    hostname === '' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.endsWith('.local');

  const isDev = forcedEnv === 'dev' || (forcedEnv !== 'prod' && isLocalHost);

  if (isDev) {
    window.APP_CONFIG = {
      APP_TITLE: 'Noël en Famille 2026 (DEV / TEST)',
      APP_ENV: 'dev',
      // Base Supabase de TEST (utilisée automatiquement en local / branches de dev)
      SUPABASE_URL: 'https://hrywvdqwddpmuecapsiv.supabase.co',
      SUPABASE_ANON_KEY: 'sb_publishable_hzMRfcmeD0_JMkWwv0aXjQ_kVvXA48D'
    };
  } else {
    window.APP_CONFIG = {
      APP_TITLE: 'Noël en Famille 2026',
      APP_ENV: 'prod',
      // Base Supabase de PRODUCTION (utilisée automatiquement sur GitHub Pages)
      SUPABASE_URL: 'https://gktyfhuavcjrlyeilbde.supabase.co',
      SUPABASE_ANON_KEY: 'sb_publishable_cwnKNGLJLXpZ3a9oBOg4qw_yspPshum'
    };
  }
})(window);
