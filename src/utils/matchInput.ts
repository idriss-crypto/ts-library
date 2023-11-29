export const matchInput = (input: string) => {
  const regPh =
    /^(\+\(?\d{1,4}\s?)\)?\-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
  const regM = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const regT = /^@[^\s]+/;
  if (input.match(regPh)) return "phone";
  if (input.match(regM)) return "mail";
  if (input.match(regT)) return "twitter";
  return null;
};
