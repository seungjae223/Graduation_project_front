import api from "./api";

export const loginApi = async ({ email, password }) => {
  const response = await api.post(
    "/api/auth/login",
    {
      email,
      password,
    },
    {
      responseType: "text",
    }
  );

  return response.data;
};