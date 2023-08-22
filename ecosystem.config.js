// ecosystem.config.js
const path = require('path');

module.exports = {
    apps: [
        {
            name: 'rental',
            script: './build/index.js',
            cwd: path.join(__dirname, './'), // 這裡使用了 __dirname
            // ... 其他選項
        },
    ],
};
