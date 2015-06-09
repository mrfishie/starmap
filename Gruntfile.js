module.exports = function(grunt) {
    grunt.initConfig({
        browserify: {
            dev: {
                src: './lib/index.js',
                dest: './dist/starmap.js',
                options: {
                    browserifyOptions: {
                        debug: true,
                        standalone: 'starmap'
                    }
                }
            },
            prod: {
                src: './lib/index.js',
                dest: './dist/starmap.min.js',
                options: {
                    transform: [['uglifyify', {'global': true}]],
                    browserifyOptions: {
                        standalone: 'starmap'
                    }
                }
            }
        },
        clean: ['./dist']
    });

    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.registerTask('dev', ['clean', 'browserify:dev']);
    grunt.registerTask('prod', ['clean', 'browserify:prod']);
    grunt.registerTask('default', ['clean', 'browserify:dev', 'browserify:prod']);
};