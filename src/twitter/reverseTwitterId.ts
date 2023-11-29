import { fetchSafe } from "../utils/fetch";

export const reverseTwitterID = async (id: string): Promise<string> => {
  const response = await fetchSafe(
    "https://www.idriss.xyz/v1/getTwitterNames?ids=" + encodeURIComponent(id),
  );
  if (response.status != 200)
    throw new Error(
      "IDriss api responded with code " +
      response.status +
      " " +
      response.statusText +
      "\r\n" +
      (await response.text()),
    );
  const json = await response.json();
  return json.twitterNames[id];
};
