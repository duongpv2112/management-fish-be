const overviewReportService = require("../services/overviewReport.service");
const { sendResult } = require("../common/sendResult");

const getOverview = async (req, res) => {
  sendResult(
    res,
    await overviewReportService.getOverview({
      from: req.query.from,
      to: req.query.to,
      includeOpen: req.query.includeOpen,
    }),
    "Lấy báo cáo tổng thành công!",
    "Lấy báo cáo tổng không thành công!"
  );
};

module.exports = { getOverview };
