const path = require('path');

module.exports = {
    entry: './index.ts',
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: [ '.ts' ]
    },
    output: {
        filename: 'idicon.js',
        library: 'idicon',
        path: path.resolve(__dirname, 'www')
    }
};