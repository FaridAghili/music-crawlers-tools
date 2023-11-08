const purgecss = require('@fullhuman/postcss-purgecss')

module.exports = {
    plugins: [
        require('autoprefixer'),
        purgecss({
            content: [
                'app/**/*.php',
                'resources/**/*.php',
            ],
            defaultExtractor: content => content.match(/[\w-/.:]+(?<!:)/g) || [],
        }),
    ],
}
