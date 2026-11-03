import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Lead } from "@/models/Lead";
import { User } from "@/models/User";
import { Role } from "@/models/Role";
import { CustomForm, FormAdminAssignment } from "@/models/CustomForm";
import { Client } from "@/models/Client";
import { AuthenticatedContext } from "@/lib/auth/session";

export interface GetLeadsParams {
  search?: string;
  status?: string;
  source?: string;
  adminId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export async function getLeadsServerSide(
  authContext: AuthenticatedContext,
  params: GetLeadsParams = {},
) {
  await connectToDatabase();

  const search = params.search?.trim() || "";
  const status = params.status?.trim() || "";
  const source = params.source?.trim() || "";
  const adminFilter = params.adminId?.trim() || "";
  const startDateParam = params.startDate?.trim() || "";
  const endDateParam = params.endDate?.trim() || "";
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 10));
  const skip = (page - 1) * limit;

  const roleSlug = authContext.role?.slug || "";
  const isSuperAdmin = roleSlug === "super_admin";
  const isAdmin = roleSlug === "admin";

  const query: any = {};

  if (isSuperAdmin) {
    if (adminFilter) {
      query.adminId = new mongoose.Types.ObjectId(adminFilter);
    }
  } else if (isAdmin) {
    query.adminId = new mongoose.Types.ObjectId(authContext.user._id);
  } else {
    // Sub-Role
    const currentUser = await User.findById(authContext.user._id).lean();
    const parentAdminId = currentUser?.parentAdminId;

    if (!parentAdminId) {
      return {
        leads: [],
        total: 0,
        totalPages: 0,
        page: 1,
        limit,
        stats: {
          allCount: 0,
          newCount: 0,
          inProgressCount: 0,
          completedCount: 0,
          rejectedCount: 0,
        },
      };
    }

    query.adminId = parentAdminId;

    if (roleSlug === "sales_executive") {
      query.$or = [
        {
          assignedSubRoleId: new mongoose.Types.ObjectId(authContext.user._id),
        },
        { createdById: new mongoose.Types.ObjectId(authContext.user._id) },
      ];
    }
  }

  if (status) {
    query.status = status;
  }

  if (source) {
    query.source = source;
  }

  if (search) {
    const searchRegex = new RegExp(search, "i");
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { clientName: searchRegex },
        { clientPhone: searchRegex },
        { clientEmail: searchRegex },
        { leadTitle: searchRegex },
      ],
    });
  }

  if (startDateParam || endDateParam) {
    query.createdAt = {};
    if (startDateParam) {
      const s = new Date(startDateParam);
      if (!isNaN(s.getTime())) {
        query.createdAt.$gte = s;
      }
    }
    if (endDateParam) {
      const e = new Date(endDateParam);
      if (!isNaN(e.getTime())) {
        query.createdAt.$lte = e;
      }
    }
    if (Object.keys(query.createdAt).length === 0) {
      delete query.createdAt;
    }
  }

  const baseQuery = { ...query };
  delete baseQuery.status;

  const [leads, total, stats] = await Promise.all([
    Lead.find(query)
      .populate("adminId", "name email")
      .populate({
        path: "assignedSubRoleId",
        select: "name email roleId",
        populate: { path: "roleId", select: "name slug" },
      })
      .populate({
        path: "createdById",
        select: "name email roleId",
        populate: { path: "roleId", select: "name slug" },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Lead.countDocuments(query),
    Promise.all([
      Lead.countDocuments(baseQuery),
      Lead.countDocuments({
        ...baseQuery,
        status: { $in: ["Pending", "New"] },
      }),
      Lead.countDocuments({ ...baseQuery, status: "In-Progress" }),
      Lead.countDocuments({ ...baseQuery, status: "Completed" }),
      Lead.countDocuments({ ...baseQuery, status: "Rejected" }),
    ]).then(
      ([
        allCount,
        newCount,
        inProgressCount,
        completedCount,
        rejectedCount,
      ]) => ({
        allCount,
        newCount,
        inProgressCount,
        completedCount,
        rejectedCount,
      }),
    ),
  ]);

  return {
    leads: JSON.parse(JSON.stringify(leads)),
    total,
    totalPages: Math.ceil(total / limit),
    page,
    limit,
    stats,
  };
}

export async function getAssignedFormServerSide(
  authContext: AuthenticatedContext,
  requestedAdminId?: string,
) {
  await connectToDatabase();

  const roleSlug = authContext.role?.slug || "";
  const isSuperAdmin = roleSlug === "super_admin";
  const isAdmin = roleSlug === "admin";

  let targetAdminId: mongoose.Types.ObjectId | null = null;

  if (isSuperAdmin) {
    if (requestedAdminId) {
      targetAdminId = new mongoose.Types.ObjectId(requestedAdminId);
    }
  } else if (isAdmin) {
    targetAdminId = new mongoose.Types.ObjectId(authContext.user._id);
  } else {
    const currentUser = await User.findById(authContext.user._id)
      .select("parentAdminId")
      .lean();
    if (currentUser?.parentAdminId) {
      targetAdminId = new mongoose.Types.ObjectId(
        currentUser.parentAdminId.toString(),
      );
    }
  }

  if (!targetAdminId) {
    return {
      assigned: false,
      message: "No admin specified or assigned",
      form: null,
    };
  }

  const assignment = await FormAdminAssignment.findOne({
    adminId: targetAdminId,
    isActive: true,
  })
    .populate("formId")
    .lean();

  if (!assignment || !assignment.formId) {
    return {
      assigned: false,
      message:
        "No dynamic lead capture form has been assigned to this Admin Organization by Super Admin.",
      form: null,
    };
  }

  const formDoc = assignment.formId as any;

  return {
    assigned: true,
    assignmentId: assignment._id.toString(),
    assignedAt: (assignment as any).assignedAt || (assignment as any).createdAt,
    form: {
      _id: formDoc._id.toString(),
      name: formDoc.name,
      description: formDoc.description,
      version: formDoc.version,
      publicSlug: formDoc.publicSlug,
      fields: formDoc.fields || [],
    },
  };
}

export async function getAdminUsersServerSide() {
  await connectToDatabase();
  const adminRole = await Role.findOne({ slug: "admin" }).lean();
  if (!adminRole) return [];
  const admins = await User.find({ roleId: adminRole._id, status: "active" })
    .select("_id name email designation")
    .lean();
  return JSON.parse(JSON.stringify(admins));
}

export async function getSubRolesServerSide() {
  await connectToDatabase();
  const subRoles = await Role.find({
    slug: { $nin: ["super_admin", "admin"] },
    isActive: true,
  })
    .select("_id name slug")
    .lean();
  return JSON.parse(JSON.stringify(subRoles));
}
