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

    concat: {
      js: {
        src: [ 'public/js/im.js', 'public/js/im.util.js',
            'public/js/im.util.gevent.js', 'public/js/im.model.js', 
            'public/js/im.shell.js', 'public/js/im.map.js', 
            'public/js/im.floorcontrol.js', 'public/js/im.popup.js', 
            'public/js/im.navigation.js'],          
        dest: 'build/js/bundle.js'
      },
      css: {
        files: {
          'build/css/bundle.css' : 'public/css/*.css'
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

    cssmin: {
      target: {
        files: {
          'build/css/bundle.min.css' : 'build/css/bundle.css'
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

  grunt.loadNpmTasks( 'grunt-contrib-jshint' );
  grunt.loadNpmTasks( 'grunt-contrib-concat' );
  grunt.loadNpmTasks( 'grunt-contrib-uglify' );
  grunt.loadNpmTasks( 'grunt-spritesmith' );
  grunt.loadNpmTasks( 'grunt-contrib-clean' );
  grunt.loadNpmTasks( 'grunt-contrib-watch' );
  grunt.loadNpmTasks( 'grunt-contrib-cssmin' );

  grunt.registerTask( 'debug', 'watch' );
  grunt.registerTask( 'release', [ 'clean', 'concat', 'uglify', 'cssmin' ] );
};