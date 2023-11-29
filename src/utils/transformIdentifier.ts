import { getTwitterID } from "../twitter";
import { convertPhone } from "./convertPhone";
import { matchInput } from "./matchInput";
import { toTitleCase } from "./toTitleCase";

export const transformIdentifier = async (input: string) => {
  const identifier = toTitleCase(input).replace(" ", "");
  const inputType = matchInput(input);

  if (inputType === null) {
    throw new Error(
      "Not a valid input. Input must start with valid phone number, email or @twitter handle.",
    );
  }

  if (inputType == "phone") {
    return convertPhone(identifier);
  }

  if (inputType == "twitter") {
    const maybeTwitterIdentifier = await getTwitterID(identifier);
    if (maybeTwitterIdentifier == "Not found") {
      throw new Error("Twitter handle not found.");
    }
    return maybeTwitterIdentifier;
  }

  return input;
};
