module.exports = {
  autoprefixer: {
    browsers: [
      'last 2 versions',
      'ie >= 8',
      'ff >= 5',
      'chrome >= 20',
      'opera >= 12',
      'safari >= 4',
      'ios >= 6',
      'android >= 2',
      'bb >= 6'
    ]
  },
  css: {
    params: {
      includePaths: [
        'node_modules/bourbon/app/assets/stylesheets/',
        'node_modules/breakpoint-sass/stylesheets/',
        'node_modules/mathsass/dist/',
        'node_modules/modernizr-mixin/stylesheets/',
        'node_modules/singularity/stylesheets/'
      ],
      errLogToConsole: true
    }
  },
  process: {
    src: 'process/',
    dist: 'process/output/',
    transparentColor: {
      src: [
        '#0000FF',
        '#00F',
        'rgb(0,0,255)',
        'rgb(0, 0, 255)',
        'rgba(0,0,255,0)',
        'rgba(0, 0, 255, 0)'
      ],
      dist: '#999'
    }
  },
  watchTasks: [
    //
    {
      files: [
        'src/**/*'
      ],
      tasks: [
        'build'
      ]
    }
  ],
  webserver: {
    host: 'localhost',
    port: 8000,
    path: '/',
    livereload: false,
    directoryListing: false,
    open: '/www/',
    https: false,
    browsers: {
      'default': 'firefox',
      'darwin': 'google chrome',
      'linux': 'google-chrome',
      'win32': 'chrome'
    }
  }
};
