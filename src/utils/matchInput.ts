export const matchInput = (input: string) => {
  const regPh =
    /^(\+\(?\d{1,4}\s?)\)?-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
  const regM = /^[\w.-]+@[\d.A-Za-z-]+\.[A-Za-z]{2,}/;
  const regT = /^@\S+/;
  if (regPh.test(input)) return 'phone';
  if (regM.test(input)) return 'mail';
  if (regT.test(input)) return 'twitter';
  return null;
};
