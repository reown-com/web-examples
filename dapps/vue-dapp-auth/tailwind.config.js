const plugin = require('tailwindcss/plugin')
const addHeaders = require('./tailwind/headers')

// get formatted color, by color and opacity
function c(color, opacityValue) {
  return opacityValue === undefined
    ? `rgb(var(${color}))`
    : `rgba(var(${color}), ${opacityValue})`
}

// get color-maker method receiving an opacity as the input, by color
function co(color) {
  return ({ opacityValue }) => c(color, opacityValue)
}

// Read more about tailwindcss configuration: https://tailwindcss.com/docs/configuration
module.exports = {
  mode: 'jit',
  prefix: 'tw-',
  safelist: [
    'light-mode',
    'dark-mode',
  ],
  theme: {
    // structure
    container: {
      center: true,
      padding: {
        DEFAULT: '1.5rem',
        md: '2rem',
        lg: '2.5rem',
      },
    },
    fontFamily: {
      main: [
        '-apple-system',
        '"Segoe UI"',
        'Helvetica',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ],
      mono: ['monospace'],
    },
    lineHeight: {
      none: 1,
      xs: 1.1,
      sm: 1.15,
    },

    // colors
    colors: {
      black: co('--c-black'),
      white: co('--c-white'),
      divider: co('--c-divider'),
      muted: co('--c-divider-muted'),
      accent: {
        primary: co('--c-accent-primary'),
        secondary: co('--c-accent-secondary'),
      },
      state: {
        error: co('--c-state-error'),
        success: co('--c-state-success'),
      },
    },
    textColor: theme => ({
      ...theme('colors'),
      'custom': co('--text-color'),
      'base': co('--c-text-base'),
      'dim-1': co('--c-text-dim-1'),
      'dim-2': co('--c-text-dim-2'),
      'dim-3': co('--c-text-dim-3'),
      'bg': co('--c-bg-base'),
    }),
    backgroundColor: theme => ({
      ...theme('colors'),
      'custom': co('--bg-color'),
      'base': co('--c-bg-base'),
      'dim-1': co('--c-bg-dim-1'),
      'placeholder': co('--c-bg-placeholder'),
    }),
    borderColor: theme => ({
      ...theme('colors'),
      base: co('--c-text-base'),
      transparent: 'transparent',
      custom: co('--border-color'),
    }),
    fill: theme => ({
      ...theme('backgroundColor'),
    }),
    stroke: theme => ({
      ...theme('borderColor'),
    }),

    // opacity
    opacity: {
      0: '0',
      muted: '0.5',
      soft: '0.8',
      full: '1',
      outline: 'var(--o-outline)',
    },
    textOpacity: theme => ({
      ...theme('opacity'),
      custom: 'var(--text-opacity)',
    }),
    backgroundOpacity: theme => ({
      ...theme('opacity'),
      custom: 'var(--bg-opacity)',
    }),
    borderOpacity: theme => ({
      ...theme('opacity'),
      custom: 'var(--border-opacity)',
    }),

    transitionDuration: {
      fast: '250ms',
      normal: '500ms',
      slow: '750ms',
    },
    zIndex: {
      muted: '-1',
      1: '1',
    },
    borderRadius: {
      0: '0',
      sm: '0.75rem',
      DEFAULT: '1rem',
      lg: '1.5rem',
      full: '9999px',
    },
    scale: {
      0: '0',
      click: '0.975',
      normal: '1',
    },

    extend: {
      blur: {
        px: '1px',
        xs: '2px',
      },
      fontSize: {
        '1/2': '0.5em',
        '5/8': '0.625em',
        '3/4': '0.75em',
        '7/8': '0.875em',
        '9/8': '1.125em',
        '5/4': '1.25em',
        '3/2': '1.5em',
      },
      boxShadow: {
        // shadows for dialogs, popups etc
        card: '0 0 2rem -1.75rem rgb(var(--c-accent-secondary))',
      },
    },
  },
  plugins: [
    plugin(addHeaders),
    ({ addUtilities, matchUtilities, theme }) => {
      const size = value => ({
        height: value,
        minHeight: value,
        width: value,
        minWidth: value,
      })
      matchUtilities(
        {
          size,
          circle: value => ({
            ...size(value),
            borderRadius: theme('borderRadius.full'),
          }),
        },
        { values: theme('height') },
      )

      addUtilities({
        '.duration-onhover-fast': {
          'transitionDuration': theme('transitionDuration.normal'),
          '&:hover': {
            transitionDuration: theme('transitionDuration.fast'),
          },
        },
      })
    },
  ],
}
