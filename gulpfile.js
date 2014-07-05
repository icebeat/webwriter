// Include gulp
var gulp = require('gulp');

// Include Plugins
var connect = require('gulp-connect');
var jshint = require('gulp-jshint');
var rigger = require('gulp-rigger');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var prefix = require('gulp-autoprefixer');
var sass = require('gulp-ruby-sass');
var csso = require('gulp-csso');

// Lint Task
gulp.task('lint', function() {
  return gulp.src('./src/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

// Compile Sass & Minify CSS
gulp.task('styles', function() {
  return gulp.src('./src/webwriter.scss')
    .pipe(sass({
      loadPath: './src'
    }))
    .pipe(prefix())
    .pipe(gulp.dest('./dist'))
    .pipe(rename({suffix: '.min'}))
    .pipe(csso())
    .pipe(gulp.dest('./dist'))
    .pipe(connect.reload());
});

// Rigger & Minify JS
gulp.task('scripts', function() {
  return gulp.src('./src/webwriter.js')
    .pipe(rigger())
    .pipe(gulp.dest('./dist'))
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .pipe(gulp.dest('./dist'))
    .pipe(connect.reload());
});

// Server with livereload Support
gulp.task('server', function() {
  connect.server({
    livereload: true
  });
});

// Watch Files For Changes
gulp.task('watch', function() {
  gulp.watch('./src/webwriter.scss', ['styles']);
  gulp.watch('./src/*.js', ['lint', 'scripts']);
});

// Default Task
gulp.task('default', ['lint', 'styles', 'scripts', 'watch', 'server']);