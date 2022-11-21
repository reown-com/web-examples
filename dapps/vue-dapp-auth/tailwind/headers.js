module.exports = ({ addBase, theme, addUtilities }) => {
  const commonHeaderStyles = {
    display: 'inline-block',
  }
  const headerStyles = {
    ...commonHeaderStyles,
    fontFamily: theme('fontFamily.display'),
    fontWeight: theme('fontWeight.bold'),
    lineHeight: theme('lineHeight.sm'),
  }
  const headerStylesStrong = {
    ...commonHeaderStyles,
    fontFamily: theme('fontFamily.display'),
    fontWeight: theme('fontWeight.black'),
    lineHeight: theme('lineHeight.none'),
    textShadow: theme('dropShadow.title'),
  }
  const headers = {
    h1: {
      ...headerStylesStrong,
      fontSize: theme('fontSize.4xl'),
      marginBottom: '1em',
    },
    h2: {
      ...headerStylesStrong,
      fontSize: theme('fontSize.3xl'),
      marginBottom: '0.75em',
    },
    h3: {
      ...headerStylesStrong,
      fontSize: theme('fontSize.2xl'),
      marginBottom: '0.75em',
    },
    h4: {
      ...headerStyles,
      fontSize: theme('fontSize.xl'),
      marginBottom: '0.625em',
    },
    h5: {
      ...headerStyles,
      fontSize: theme('fontSize.lg'),
      marginBottom: '0.5em',
    },
    h6: {
      ...headerStyles,
      fontSize: theme('fontSize.normal'),
      marginBottom: '0.375em',
    },
  }

  // bind styles to tags
  addBase(headers)

  // create .h# utils (e.g. `tw-h6` etc)
  addUtilities(Object.entries(headers).reduce((utils, [tag, styles]) => ({
    ...utils,
    [`.${tag}`]: styles,
  }), {}))
}
