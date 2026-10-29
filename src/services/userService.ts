import { connectToDatabase } from '../lib/mongodb/db';
import { User, IUserDocument } from '../models/User';
import { Role } from '../models/Role';
import { hashPassword } from '../lib/auth/password';
import { recordAuditEvent } from './auditService';
import { SafeUser, UserStatus } from '../types';

export interface UserListFilters {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  branch?: string;
  roleId?: string;
  status?: string;
  parentAdminId?: string;
  excludeSuperAdmin?: boolean;
  allowedUserIds?: string[];
  roleSlug?: string;
  userType?: 'admin' | 'staff'; // 'admin' = only Admins, 'staff' = only Sub-Role staff (non-admin, non-superadmin)
}

export async function listUsers(filters: UserListFilters = {}) {
  await connectToDatabase();

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 10));
  const skip = (page - 1) * limit;

  const query: Record<string, any> = {};

  if (filters.userType === 'admin') {
    const adminRole = await Role.findOne({ slug: 'admin' });
    if (adminRole) {
      query.roleId = adminRole._id;
    }
  } else if (filters.userType === 'staff') {
    const excludedRoles = await Role.find({ slug: { $in: ['super_admin', 'admin'] } });
    query.roleId = { $nin: excludedRoles.map((r) => r._id) };
  } else if (filters.roleSlug) {
    const targetRole = await Role.findOne({ slug: filters.roleSlug });
    if (targetRole) {
      query.roleId = targetRole._id;
    }
  } else if (filters.excludeSuperAdmin) {
    const superAdminRole = await Role.findOne({ slug: 'super_admin' });
    if (superAdminRole) {
      query.roleId = { $ne: superAdminRole._id };
    }
  }

  if (filters.allowedUserIds && filters.allowedUserIds.length > 0) {
    query._id = { $in: filters.allowedUserIds };
  } else if (filters.parentAdminId) {
    if (filters.userType === 'staff') {
      // In Staff section, only return staff belonging to this admin
      query.parentAdminId = filters.parentAdminId;
    } else {
      query.$or = [
        { parentAdminId: filters.parentAdminId },
        { _id: filters.parentAdminId },
      ];
    }
  }

  if (filters.search && filters.search.trim()) {
    const searchRegex = new RegExp(filters.search.trim(), 'i');
    const searchCondition = [
      { name: searchRegex },
      { email: searchRegex },
      { employeeId: searchRegex },
      { mobile: searchRegex },
    ];
    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchCondition }];
      delete query.$or;
    } else {
      query.$or = searchCondition;
    }
  }

  if (filters.department) {
    query.department = filters.department;
  }
  if (filters.branch) {
    query.branch = filters.branch;
  }
  if (filters.roleId) {
    query.roleId = filters.roleId;
  }
  if (filters.status) {
    query.status = filters.status;
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .populate('roleId', 'name slug description isSystem leadVisibilityScope')
      .populate('reportingManagerId', 'name employeeId email designation')
      .populate({
        path: 'parentAdminId',
        select: 'name employeeId email designation',
        strictPopulate: false,
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  const safeUsers: SafeUser[] = users.map((u: any) => {
    delete u.passwordHash;
    return {
      ...u,
      _id: u._id.toString(),
      role: u.roleId,
      reportingManager: u.reportingManagerId,
    };
  });

  return {
    users: safeUsers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUserById(id: string): Promise<SafeUser | null> {
  await connectToDatabase();

  const user = await User.findById(id)
    .populate('roleId', 'name slug description isSystem leadVisibilityScope permissions')
    .populate('reportingManagerId', 'name employeeId email designation');

  if (!user) {
    return null;
  }

  const safe = user.toSafeUser();
  safe.role = user.roleId as any;
  safe.reportingManager = user.reportingManagerId as any;
  return safe;
}

export async function createUser(data: any, actor: { userId?: string; employeeId?: string; name: string; email: string; roleSlug: string }): Promise<SafeUser> {
  await connectToDatabase();

  // Auto-generate employeeId if not provided
  const employeeId = data.employeeId && data.employeeId.trim()
    ? data.employeeId.trim().toUpperCase()
    : `STF${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

  // Validate uniqueness
  const existingUser = await User.findOne({
    $or: [{ email: data.email.toLowerCase() }, { employeeId }],
  });

  if (existingUser) {
    if (existingUser.email.toLowerCase() === data.email.toLowerCase()) {
      throw new Error(`User with email '${data.email}' already exists`);
    }
    if (existingUser.employeeId?.toUpperCase() === employeeId) {
      throw new Error(`User with Employee ID '${employeeId}' already exists`);
    }
  }

  // Validate role
  const role = await Role.findById(data.roleId);
  if (!role) {
    throw new Error('Assigned role does not exist');
  }

  // Privilege ceiling check on initial creation
  if (role.slug === 'super_admin' && actor.roleSlug !== 'super_admin') {
    throw new Error('Forbidden: Only a Super Admin can assign the Super Admin role');
  }

  const passwordHash = await hashPassword(data.password);

  const newUser = await User.create({
    employeeId,
    name: data.name,
    email: data.email.toLowerCase(),
    passwordHash,
    mobile: data.mobile,
    department: data.department,
    roleId: role._id,
    designation: data.designation,
    branch: data.branch,
    profilePhoto: data.profilePhoto || '',
    joiningDate: data.joiningDate,
    status: data.status || 'active',
    loginStatus: 'never_logged_in',
    reportingManagerId: data.reportingManagerId || null,
    team: data.team || '',
    allowedSubRoles: data.allowedSubRoles || [],
    parentAdminId: data.parentAdminId || (actor.roleSlug === 'admin' ? actor.userId : null),
    createdBy: actor.userId || null,
  });

  // Record audit log
  await recordAuditEvent({
    actor,
    action: 'create',
    entity: 'user',
    entityId: newUser._id.toString(),
    targetUserId: newUser._id.toString(),
    parentAdminId: newUser.parentAdminId ? newUser.parentAdminId.toString() : undefined,
    newValues: {
      employeeId: newUser.employeeId,
      name: newUser.name,
      email: newUser.email,
      role: role.slug,
      department: newUser.department,
      designation: newUser.designation,
      branch: newUser.branch,
      status: newUser.status,
      allowedSubRoles: newUser.allowedSubRoles,
      parentAdminId: newUser.parentAdminId,
    },
    source: 'web_app',
  });

  const safe = newUser.toSafeUser();
  safe.role = role.toObject() as any;
  return safe;
}

export async function updateUser(
  id: string,
  data: any,
  actor: { userId?: string; employeeId?: string; name: string; email: string; roleSlug: string }
): Promise<SafeUser> {
  await connectToDatabase();

  const user = await User.findById(id);
  if (!user) {
    throw new Error('User not found');
  }

  // If email change requested, verify uniqueness
  if (data.email && data.email.toLowerCase() !== user.email) {
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing && existing._id.toString() !== id) {
      throw new Error(`Email '${data.email}' is already taken by another staff member`);
    }
  }

  const oldValues = {
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    department: user.department,
    designation: user.designation,
    branch: user.branch,
    roleId: user.roleId.toString(),
    status: user.status,
    team: user.team,
  };

  if (data.name) user.name = data.name;
  if (data.email) user.email = data.email.toLowerCase();
  if (data.mobile) user.mobile = data.mobile;
  if (data.department) user.department = data.department;
  if (data.designation) user.designation = data.designation;
  if (data.branch) user.branch = data.branch;
  if (data.profilePhoto !== undefined) user.profilePhoto = data.profilePhoto;
  if (data.joiningDate) user.joiningDate = data.joiningDate;
  if (data.team !== undefined) user.team = data.team;
  if (data.reportingManagerId !== undefined) user.reportingManagerId = data.reportingManagerId;

  if (data.roleId && data.roleId !== user.roleId.toString()) {
    if (actor.userId && actor.userId.toString() === id.toString()) {
      throw new Error('Self-escalation forbidden: You cannot change your own role');
    }
    const role = await Role.findById(data.roleId);
    if (!role) {
      throw new Error('Assigned role does not exist');
    }
    if (role.slug === 'super_admin' && actor.roleSlug !== 'super_admin') {
      throw new Error('Forbidden: Only a Super Admin can assign the Super Admin role');
    }
    user.roleId = role._id as any;
  }

  if (data.password) {
    user.passwordHash = await hashPassword(data.password);
  }

  if (data.status) {
    user.status = data.status;
  }
  if (data.allowedSubRoles !== undefined) {
    user.allowedSubRoles = data.allowedSubRoles;
  }
  if (data.parentAdminId !== undefined) {
    user.parentAdminId = data.parentAdminId;
  }

  await user.save();

  await recordAuditEvent({
    actor,
    action: 'update',
    entity: 'user',
    entityId: user._id.toString(),
    targetUserId: user._id.toString(),
    parentAdminId: user.parentAdminId ? user.parentAdminId.toString() : undefined,
    oldValues,
    newValues: {
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      department: user.department,
      designation: user.designation,
      branch: user.branch,
      roleId: user.roleId.toString(),
      status: user.status,
      team: user.team,
      allowedSubRoles: user.allowedSubRoles,
      parentAdminId: user.parentAdminId,
    },
    source: 'web_app',
  });

  return getUserById(id) as Promise<SafeUser>;
}

export async function updateUserStatus(
  id: string,
  status: UserStatus,
  reason: string = '',
  actor: { userId?: string; employeeId?: string; name: string; email: string; roleSlug: string }
): Promise<SafeUser> {
  await connectToDatabase();

  const user = await User.findById(id).populate('roleId');
  if (!user) {
    throw new Error('User not found');
  }

  const role = user.roleId as any;

  // Prevent deactivating the only active Super Admin
  if (status === 'inactive' && role?.slug === 'super_admin') {
    const superAdminRole = await Role.findOne({ slug: 'super_admin' });
    const activeSuperAdmins = await User.countDocuments({
      roleId: superAdminRole?._id,
      status: 'active',
    });
    if (activeSuperAdmins <= 1) {
      throw new Error('Cannot deactivate the last remaining active Super Administrator account');
    }
  }

  const oldStatus = user.status;
  user.status = status;
  if (status === 'inactive') {
    user.loginStatus = 'offline';
  }
  await user.save();

  await recordAuditEvent({
    actor,
    action: 'status_change',
    entity: 'user',
    entityId: user._id.toString(),
    targetUserId: user._id.toString(),
    parentAdminId: user.parentAdminId ? user.parentAdminId.toString() : undefined,
    oldValues: { status: oldStatus },
    newValues: { status, reason },
    source: 'web_app',
  });

  return getUserById(id) as Promise<SafeUser>;
}

export async function deleteUser(
  id: string,
  actor: { userId?: string; employeeId?: string; name: string; email: string; roleSlug: string }
): Promise<void> {
  await connectToDatabase();

  const user = await User.findById(id).populate('roleId');
  if (!user) {
    throw new Error('User not found');
  }

  const role = user.roleId as any;
  if (role?.slug === 'super_admin') {
    throw new Error('Super Admin accounts cannot be deleted');
  }

  await User.findByIdAndDelete(id);

  await recordAuditEvent({
    actor,
    action: 'delete',
    entity: 'user',
    entityId: id,
    targetUserId: id,
    parentAdminId: user.parentAdminId ? user.parentAdminId.toString() : undefined,
    oldValues: {
      name: user.name,
      email: user.email,
      employeeId: user.employeeId,
      role: role?.name,
    },
    source: 'web_app',
  });
}
