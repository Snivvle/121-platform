// Output should be a valid TS-file:
module.exports = `// THIS FILE IS GENERATED BY 'npm run set-env-variables'

export const environment = {
  production: ${process.env.NG_PRODUCTION || true},

  // Configuration/Feature-switches:
  isDebug: ${process.env.NG_IS_DEBUG || 'false'},
  showDebug: ${process.env.NG_SHOW_DEBUG || 'false'},
  useAnimation: ${process.env.NG_USE_ANIMATION || 'true'},
  disableTextPlayer: ${process.env.NG_DISABLE_TEXT_PLAYER || 'false'},
  alwaysShowTextPlayer: ${process.env.NG_ALWAYS_SHOW_TEXT_PLAYER || 'false'},
  useServiceWorker: ${process.env.NG_USE_SERVICE_WORKER || 'false'},

  envName: '${process.env.NG_ENV_NAME || ''}',
  locales: '${process.env.NG_LOCALES || 'en,ar,fr,nl,pt_BR,tl,in,es'}',

  // APIs:
  url_121_service_api: '${process.env.NG_URL_121_SERVICE_API || ''}',

  // Third-party tokens:
  ai_ikey: '${process.env.NG_AI_IKEY || ''}',
  ai_endpoint: '${process.env.NG_AI_ENDPOINT || ''}',

  matomo_id: '${process.env.NG_MATOMO_ID || ''}',
  matomo_endpoint_api: '${process.env.NG_MATOMO_ENDPOINT_API || ''}',
  matomo_endpoint_js: '${process.env.NG_MATOMO_ENDPOINT_JS || ''}',
};
`;
