var _ = require('lodash');
var autoprefixer = require('gulp-autoprefixer');
var cheerio = require('cheerio');
var cssmin = require('gulp-cssmin');
var fs = require('fs-extra');
var ghPages = require('gulp-gh-pages');
var globPromise = require('glob-promise');
var gm = require('gm');
var gulp = require('gulp');
var livereload = require('livereload');
var nunjucks = require('nunjucks');
var open = require('open');
var os = require('os');
var path = require('path');
var pngquant = require('pngquant');
var Promise = require('bluebird');
var rename = require('gulp-rename');
var runSequence = require('run-sequence');
var sanitizeFilename = require('sanitize-filename');
var sass = require('gulp-sass');
var streamifier = require('streamifier');
var svg2png = require('svg2png');
var svgmin = require('gulp-svgmin');
var uglify = require('gulp-uglify');
var webserver = require('gulp-webserver');

Promise.promisifyAll(fs);

/*******************************************************************************
 * Config
 ******************************************************************************/

var config = require('./gulp-config.js');

var livereloadOpen = (config.webserver.https ? 'https' : 'http') + '://' + config.webserver.host + ':' + config.webserver.port + (config.webserver.open ? config.webserver.open : '/');

/*******************************************************************************
 * Misc
 ******************************************************************************/

var flags = {
  livereloadInit: false // Whether `livereload-init` task has been run
};
var server;

// Choose browser for node-open.
var browser = config.webserver.browsers.default;
var platform = os.platform();
if (_.has(config.webserver.browsers, platform)) {
  browser = config.webserver.browsers[platform];
}

// Create directory in which SVG files that should be processed are stored.
fs.mkdirpSync(config.process.src);

/*******************************************************************************
 * Functions
 ******************************************************************************/

/**
 *
 * @param  {String} src
 * @param  {String} dist
 * @return {Stream}
 */
function buildCss(src, dist) {
  return gulp
    .src(src)
    .pipe(sass(config.css.params).on('error', sass.logError))
    .pipe(autoprefixer(config.autoprefixer))
    .pipe(gulp.dest(dist))
    .pipe(cssmin({
      advanced: false
    }))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest(dist));
}

/**
 *
 * @param  {String} src
 * @param  {String} dist
 * @return {Stream}
 */
function buildJs(src, dist) {
  return gulp
    .src(src)
    .pipe(gulp.dest(dist))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(uglify())
    .pipe(gulp.dest(dist));
}

/**
 *
 * @param  {String} src
 * @param  {String} dist
 * @return {Stream}
 */
function buildSvg(src, dist) {
  return gulp
    .src(src)
    .pipe(svgmin({
      js2svg: {
        pretty: true
      },
      plugins: [{
        moveElemsAttrsToGroup: false
      }]
    }))
    .pipe(gulp.dest(dist));
}

/**
 *
 * @param  {String} src Soure file path
 * @param  {String} destDir Destination directory path
 * @param  {Number} scale
 * @param  {String} suffix
 * @return {Promise}
 */
function process(src, destDir, scale, suffix) {
  var extname = path.extname(src);
  var basename = path.basename(src, extname);
  var dest = path.join(destDir, basename + (_.isUndefined(suffix) ? '' : suffix) + '.png');

  return fs.mkdirpAsync(destDir)
    .then(function () {
      return fs.readFileAsync(src, 'utf-8');
    })
    .then(function (data) {
      var resize;

      if (scale) {
        var $ = cheerio.load(data, {
          xmlMode: true
        });
        var $svg = $('svg');

        // https://github.com/domenic/svg2png/blob/v3.0.1/lib/converter.js#L90
        var width = $svg.attr('width');
        var height = $svg.attr('height');
        var viewBox = $svg.attr('viewBox');
        var widthIsPercent = /%\s*$/.test(width);
        var heightIsPercent = /%\s*$/.test(height);
        width = !widthIsPercent && parseFloat(width);
        height = !heightIsPercent && parseFloat(height);

        if (width && height) {
          resize = {
            width: width * scale,
            height: height * scale
          };

          if (!viewBox) {
            $svg.attr('viewBox', '0 0 ' + width + ' ' + height);
          }
        }

        data = $.xml();
      }

      _.forEach(config.process.transparentColor.src, function (str) {
        data = data.replace(new RegExp(_.escapeRegExp(str), 'gi'), config.process.transparentColor.dist);
      });

      // Convert SVG to PNG.
      var buffer = new Buffer(data, 'utf-8');

      return svg2png(buffer, resize);
    })
    .then(function (buffer) {
      return new Promise(function (resolve, reject) {
        gm(buffer, dest)
          .type('truecolormatte')
          .transparent(config.process.transparentColor.dist)
          .trim()
          .toBuffer('PNG', function (err, buffer) {
            if (err) {
              reject(err);
            }
            else {
              resolve(buffer);
            }
          })
      });
    })
    .then(function (buffer) {
      return new Promise(function (resolve, reject) {
        var writeStream = fs.createWriteStream(dest);

        writeStream.on('close', function () {
          resolve();
        });

        var readStream = streamifier.createReadStream(buffer)
          // Minify PNG.
          .pipe(new pngquant([256]))
          .pipe(writeStream);
      });
    });
}

/**
 * Start a watcher.
 *
 * @param {Array} files
 * @param {Array} tasks
 * @param {Boolean} livereload Set to TRUE to force livereload to refresh the page.
 */
function startWatch(files, tasks, livereload) {
  if (livereload) {
    tasks.push('livereload-reload');
  }

  gulp.watch(files, function () {
    runSequence.apply(null, tasks);
  });
}

/*******************************************************************************
 * Livereload tasks
 ******************************************************************************/

// Start webserver.
gulp.task('webserver-init', function (cb) {
  var conf = _.clone(config.webserver);
  conf.open = false;

  gulp.src('./')
    .pipe(webserver(conf))
    .on('end', cb);
});

// Start livereload server
gulp.task('livereload-init', function (cb) {
  if (!flags.livereloadInit) {
    flags.livereloadInit = true;
    server = livereload.createServer();
    open(livereloadOpen, browser);
  }

  cb();
});

// Refresh page
gulp.task('livereload-reload', function (cb) {
  server.refresh(livereloadOpen);
  cb();
});

/*******************************************************************************
 * Tasks
 ******************************************************************************/

gulp.task('clean-demo', function () {
  return fs.removeAsync('demo/');
});

gulp.task('build-demo-css', function (cb) {
  buildCss('src/css/**/*.scss', 'demo/css/')
    .on('end', cb);
});

gulp.task('build-demo-js', function (cb) {
  buildJs('src/js/**/*.js', 'demo/js/')
    .on('end', cb);
});

gulp.task('build-demo-svg', function (cb) {
  buildSvg('src/svg/**/*.svg', 'demo/svg/')
    .on('end', cb);
});

gulp.task('build-demo-page', function () {
  var context = {};
  var data = nunjucks.render('src/index.njk', context);

  return fs.outputFileAsync('demo/index.html', data, 'utf-8');
});

gulp.task('build-demo-vendor', function () {
  return gulp.src([
      'node_modules/normalize-css/**/*',
      'node_modules/dat.gui/**/*',
      'node_modules/lodash/**/*',
      'node_modules/jsnetworkx/**/*',
      'node_modules/d3/**/*',
      'node_modules/d3-save-svg/**/*',
      'node_modules/dat.gui/**/*'
    ], {
      base: 'node_modules'
    })
    .pipe(gulp.dest('demo/vendor/'));
});

gulp.task('build', function (cb) {
  runSequence(
    'clean-demo',
    'build-demo-css',
    'build-demo-js',
    'build-demo-svg',
    'build-demo-page',
    'build-demo-vendor',
    cb
  );
});

gulp.task('deploy', function () {
  return gulp.src('demo/**/*')
    .pipe(ghPages());
});

gulp.task('livereload', function () {
  runSequence(
    'build',
    'webserver-init',
    'livereload-init',
    'watch:livereload'
  );
});

gulp.task('process', function () {
  return globPromise(path.join(config.process.src, '*.svg'))
    .then(function (files) {
      return Promise.mapSeries(files, function (file) {
        return Promise.mapSeries([1, 2], function (scale) {
          return process(file, config.process.dist, scale, scale === 1 ? undefined : '@' + scale + 'x');
        });
      });
    });
});

/*******************************************************************************
 * Watch tasks
 ******************************************************************************/

// Watch with livereload that doesn't rebuild docs
gulp.task('watch:livereload', function (cb) {
  var livereloadTask = 'livereload-reload';

  _.forEach(config.watchTasks, function (watchConfig) {
    var tasks = _.clone(watchConfig.tasks);
    tasks.push(livereloadTask);
    startWatch(watchConfig.files, tasks);
  });
});

/*******************************************************************************
 * Default task
 ******************************************************************************/

gulp.task('default', ['build', 'process']);
