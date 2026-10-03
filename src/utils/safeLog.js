// Never pass Axios config, request/response bodies or credentials to the console.
export const logSafeApiError = (error, context = "request") => {
  const status = Number(error?.response?.status);
  console.error("Request failed", {
    context,
    ...(Number.isInteger(status) && status >= 100 && status <= 599 ? { status } : {}),
  });
};
