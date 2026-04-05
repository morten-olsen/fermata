const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

const SERVICE_NAME = 'expo.modules.nowplaying.NowPlayingService';

const withNowPlaying = (config) => {
  config = withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

    if (!application.service) application.service = [];

    const exists = application.service.find(
      (s) => s.$?.['android:name'] === SERVICE_NAME
    );

    if (!exists) {
      application.service.push({
        $: {
          'android:name': SERVICE_NAME,
          'android:exported': 'false',
          'android:foregroundServiceType': 'mediaPlayback',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'androidx.media3.session.MediaSessionService' } }],
          },
        ],
      });
    }

    return config;
  });

  return config;
};

module.exports = withNowPlaying;
