module.exports = function(grunt) {

  grunt.initConfig({

    rig: {
      build: {
        src: 'src/webwriter.js',
        dest: 'dist/webwriter.js'
      }
    },

    uglify: {
      options: {
        mangle: false
      },
      standard: {
        files: {
          'dist/webwriter.min.js': 'dist/webwriter.js'
        }
      }
    },

    watch: {
      scripts: {
        files: ['src/*.js', 'src/**/*.js'],
        tasks: 'default'
      }
    }

  });

  grunt.loadNpmTasks('grunt-rigger');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['rig', 'uglify']);

};