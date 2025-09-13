import crypto from "crypto";
import { AxiosRequestConfig } from "axios";

const excludeKeys = ["access_token", "sign"] as const;

export const generateSign = (
  requestConfig: AxiosRequestConfig,
  app_secret: string
) => {
  let signString = "";
  
  // step1: Extract all query parameters excluding sign and access_token. Reorder the parameter keys in alphabetical order:
  const params = requestConfig.params || {};
  const sortedParams = Object.keys(params)
    .filter((key) => !excludeKeys.includes(key as any))
    .sort()
    .map((key) => ({ key, value: params[key] }));
    
  //step2: Concatenate all the parameters in the format {key}{value}:
  const paramString = sortedParams
    .map(({ key, value }) => `${key}${value}`)
    .join("");

  signString += paramString;

  //step3: Append the string from Step 2 to the API request path:
  const pathname = new URL(requestConfig.url || '').pathname;
  signString = `${pathname}${paramString}`;

  //step4: If the request header content_type is not multipart/form-data, append the API request body to the string from Step 3:
  if (
    requestConfig.headers?.["content-type"] !== "multipart/form-data" &&
    requestConfig.data &&
    Object.keys(requestConfig.data).length
  ) {
    const body = JSON.stringify(requestConfig.data);
    signString += body;
  }

  //step5: Wrap the string generated in Step 4 with the app_secret:
  signString = `${app_secret}${signString}${app_secret}`;

  //step6: Encode your wrapped string using HMAC-SHA256:
  const hmac = crypto.createHmac("sha256", app_secret);
  hmac.update(signString);
  const sign = hmac.digest("hex");

  return sign;
};