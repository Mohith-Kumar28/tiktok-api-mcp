import crypto from "crypto";

const excludeKeys = ["access_token", "sign"] as const;

interface GenerateSignOptions {
  path: string;
  method: string;
  appSecret: string;
  queryParams: Record<string, any>;
  body?: any;
}

export const generateSign = (options: GenerateSignOptions) => {
  const { path, appSecret, queryParams, body } = options;
  let signString = "";
  // step1: Extract all query parameters excluding sign and access_token. Reorder the parameter keys in alphabetical order:
  const sortedParams = Object.keys(queryParams)
    .filter((key) => !excludeKeys.includes(key as any))
    .sort()
    .map((key) => ({ key, value: queryParams[key] }));
  //step2: Concatenate all the parameters in the format {key}{value}:
  const paramString = sortedParams
    .map(({ key, value }) => `${key}${value}`)
    .join("");

  signString += paramString;

  //step3: Append the string from Step 2 to the API request path:
  signString = `${path}${paramString}`;

  //step4: If the request body exists, append it to the string from Step 3:
  if (body && Object.keys(body).length) {
    const bodyString = JSON.stringify(body);
    signString += bodyString;
  }

  //step5: Wrap the string generated in Step 4 with the app_secret:
  signString = `${appSecret}${signString}${appSecret}`;

  //step6: Encode your wrapped string using HMAC-SHA256:
  const hmac = crypto.createHmac("sha256", appSecret);
  hmac.update(signString);
  const sign = hmac.digest("hex");

  return sign;
};