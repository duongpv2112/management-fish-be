// Gửi envelope { success, data, message } từ kết quả { ok, data, message } của service
const sendResult = (res, result, successMessage, failMessage) => {
  res.json({
    success: result.ok,
    data: result.ok ? result.data : [],
    message: result.ok ? successMessage : result.message || failMessage,
  });
};

module.exports = { sendResult };
