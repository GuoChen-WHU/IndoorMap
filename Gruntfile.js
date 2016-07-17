module.exports = function (grunt) {
  
  grunt.initConfig({
    
    jshint: {
      options: {
        'undef': true,
        'unused': true,
        'predef': ['im', 'ol', '$'],
        'devel': true
      },
      client: [
        'public/js/**/*.js'
      ]
    },

    // use this to copy all files to build folder, bad idea
    concat: {
      js: {
        files: {
          'build/js/im.js'             : 'public/js/im.js',
          'build/js/im.util.js'        : 'public/js/im.util.js',
          'build/js/im.shell.js'       : 'public/js/im.shell.js',
          'build/js/im.model.js'       : 'public/js/im.model.js',
          'build/js/im.map.js'         : 'public/js/im.map.js',
          'build/js/im.floorcontrol.js': 'public/js/im.floorcontrol.js'
        }
      },
      css: {
        files: {
          'build/css/im.css'            : 'public/css/im.css',
          'build/css/im.shell.css'      : 'public/css/im.shell.css',
          'build/css/im.floorcontrol.css'      : 'public/css/im.floorcontrol.css'
        }
      }
    },

    uglify: {
      bundle: {
        files: {
          'build/js/bundle.min.js': 'build/js/bundle.js'
        }
      }
    },

    sprite: {
      icons: {
        src: 'public/img/icons/*.png',
        destImg: 'build/img/icons.png',
        destCSS: 'build/css/icons.css'
      }
    },

    clean: {
      js: 'build/js',
      css: 'build/css'
      //less: 'public/**/*.css'
    },

    watch: {
      js: {
        tasks: ['jshint:client'],
        files: ['public/js/**/*.js']
      },
      css: {
        tasks: [],
        files: ['public/css/**/*.css']
      }
    }

  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-spritesmith');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('debug', 'watch');
};