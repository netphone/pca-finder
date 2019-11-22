Package.describe({
    name: 'ohif:themes',
    summary: 'OHIF Themes overridable package',
    version: '0.0.1'
});

Package.onUse(function(api) {
    api.versionsFrom('1.4.2.3');

   api.use('stylus@=2.513.14');

    api.use('ohif:themes-common', 'client');

    // Importable themes related variables
    api.addFiles('themes.styl', 'client', { isImport: true });
});
