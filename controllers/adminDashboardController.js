const UserRequest = require("../models/UserRequest");
const User = require("../models/User");

// Get overall dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    // Calculate start/end of today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Total requests today
    const totalRequestsToday = await UserRequest.countDocuments({
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    // Total users
    const totalUsers = await User.countDocuments();

    // Requests per endpoint today (grouped)
    const requestsByEndpointToday = await UserRequest.aggregate([
      { $match: { date: { $gte: startOfDay, $lte: endOfDay } } },
      {
        $group: {
          _id: "$endpoint",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Top 5 active users today
    const topUsersToday = await UserRequest.aggregate([
      { $match: { date: { $gte: startOfDay, $lte: endOfDay } } },
      {
        $group: {
          _id: "$userId",
          requestCount: { $sum: 1 },
        },
      },
      { $sort: { requestCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users", // Collection name (lowercase, plural of User model)
          localField: "_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$userDetails" },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          requestCount: 1,
          email: "$userDetails.email",
          fullname: "$userDetails.fullname",
        },
      },
    ]);

    // Total requests ever
    const totalRequestsEver = await UserRequest.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalRequestsToday,
        totalRequestsEver,
        requestsByEndpointToday,
        topUsersToday,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get dashboard stats",
      error: error.message,
    });
  }
};

// Get detailed request logs (paginated)
const getRequestLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const totalLogs = await UserRequest.countDocuments();

    const logs = await UserRequest.find()
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "fullname email");

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalLogs / limit),
          totalLogs,
          limit,
        },
      },
    });
  } catch (error) {
    console.error("Request logs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get request logs",
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardStats,
  getRequestLogs,
};
