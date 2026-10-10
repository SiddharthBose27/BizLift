// server/utils/apiResponse.js

export const ok = (res, data = {}, message = "Success", status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    ...data,
  });
};

export const fail = (
  res,
  message = "Request failed",
  status = 500,
  extra = {},
) => {
  return res.status(status).json({
    success: false,
    message,
    ...extra,
  });
};
