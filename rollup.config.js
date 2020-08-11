/**
 * Created by chrou on 2019/11/06.
 */
import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import {uglify} from 'rollup-plugin-uglify';
export default {
    input: './index.js',
    // input: 'examples/test.js',
    output: {
        file: 'dist/sdk.js',
        // file: 'dist/test.js',
        format: 'umd',
        name: 'WebRTCSdk'
    },
    plugins: [
        resolve(),
        commonjs({ // 处理commonjs规范的npm包，如jquery
            include: 'node_modules/**',
            namedExports: { 'src/main.js': ['$', 'jquery' ] }
        }),
        babel({
            babelrc: false,
            exclude: 'node_modules/**', // 只编译我们的源代码
            presets: [['@babel/preset-env', { modules: false, "useBuiltIns": "usage"  }]],
        }),
        uglify() //为不影响调试，开发阶段注释--如想调试build出来的结果，请将uglify()注释掉
    ],
    external: ['jquery', '$']
};
