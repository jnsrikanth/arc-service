export const isValidPassword = (password: string) => {
  ///https://rubular.com/r/UAwoaPM0Ji
  const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$&*])(?=.*[0-9])(?=.*[a-z]).{8,}$/
  return passwordRegex.test(password)
}
export const padDoubleQuotes = (value: string) => `"${value}"`

export const stripProtocol = (url: string) => url.replace(/(^\w+:|^)\/\//, '');
